'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  type CSSProperties,
} from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useRoomStore } from '@/store/roomStore';
import { usePlayerStore } from '@/store/playerStore';
import { getSocket } from '@/lib/socket';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useRoomSocket } from '@/hooks/useRoomSocket';
import { usePlayback } from '@/hooks/usePlayback';
import { useRoomQueue } from '@/hooks/useRoomQueue';
import { useVoiceChat } from '@/features/room/hooks/useVoiceChat';
import { emitRequestSync, emitVoiceJoinSlot, emitVoiceLeaveSlot, emitVoiceToggle } from '@/socket/emitters';
import { roomService } from '@/features/room/room.service';
import { SearchPanel, Lyrics } from '@/features/room/components';
import { useLyrics } from '@/hooks/useLyrics';
import { getSongMeta, getSongTitle } from '@/lib/songHelpers';
import { playlistAPI, songAPI } from '@/shared/lib/api';
import { useToastStore } from '@/store/toastStore';
import type { PlayMode, RepeatMode } from '@/types/player';
import './room.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

const FALLBACK_ART =
  'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80';
const FALLBACK_AVATAR = 'https://i.pravatar.cc/100?img=11';

// ─── Sub-components ───────────────────────────────────────────────────────────

interface WaveformProps { bars?: number }
const Waveform = memo(({ bars = 24 }: WaveformProps) => (
  <div className="wave" aria-hidden="true">
    {Array.from({ length: bars }, (_, i) => <span key={i} />)}
  </div>
));
Waveform.displayName = 'Waveform';

// ---

interface SongRowProps {
  song: any;
  index: number;
  isCurrent?: boolean;
  onPlay: (song: any, idx?: number) => void;
  showAddBtn?: boolean;
  onAdd?: (song: any) => void;
}
const SongRow = memo(({ song, index, isCurrent, onPlay, showAddBtn, onAdd }: SongRowProps) => (
  <div className={`song-row${isCurrent ? ' active' : ''}`}>
    <span className="song-index">{isCurrent ? '▮' : index + 1}</span>
    <img
      className="song-thumb"
      src={song.coverArt || song.thumbnail || FALLBACK_AVATAR}
      alt=""
      loading="lazy"
    />
    <div className="song-info">
      <h4 className="song-title">{getSongTitle(song)}</h4>
      <p className="song-meta">{getSongMeta(song) || 'Unknown artist'}</p>
    </div>
    <time className="song-dur">{fmt(Number(song.duration || 0))}</time>
    <div className="song-actions-sm">
      <button type="button" className="song-btn add-btn" onClick={() => onAdd?.(song)} aria-label="Thêm vào hàng đợi">＋</button>
      <button type="button" className="song-btn play-btn-sm" onClick={() => onPlay(song, index)} aria-label="Phát">▶</button>
    </div>
  </div>
));
SongRow.displayName = 'SongRow';

// ---

interface MemberRowProps { item: any; idx: number }
const MemberRow = memo(({ item, idx }: MemberRowProps) => {
  const u = item.user || item;
  const initial = u?.username?.charAt(0)?.toUpperCase() || 'U';
  const isHost = item.role === 'Chủ phòng';
  return (
    <div className="member-row" key={u?._id || u?.username || idx}>
      <span className="member-avatar">{initial}</span>
      <div className="member-info">
        <strong>{u?.username || 'Listener'}{isHost ? ' 👑' : ''}</strong>
        <span className={`member-role${isHost ? ' host' : ''}`}>{item.role || 'Thành viên'}</span>
      </div>
      <i className="online-dot" />
    </div>
  );
});
MemberRow.displayName = 'MemberRow';

// ---

interface ChatBubbleProps { msg: any; idx: number }
const ChatBubble = memo(({ msg, idx }: ChatBubbleProps) => (
  <div className="chat-message" key={msg._id || idx}>
    <span className="chat-avatar">{msg.sender?.username?.charAt(0)?.toUpperCase() || 'U'}</span>
    <div className="chat-body">
      <strong className="chat-sender">{msg.sender?.username || 'User'}</strong>
      <p className="chat-text">{msg.content}</p>
    </div>
    {msg.createdAt && (
      <time className="chat-time">
        {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
      </time>
    )}
  </div>
));
ChatBubble.displayName = 'ChatBubble';

// ─── Main Page ────────────────────────────────────────────────────────────────

type ActivePanel = 'queue' | 'history' | 'search' | 'chat' | 'lyrics';

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const playSongId = searchParams.get('play');
  const playSyncRef = useRef<string | null>(null);

  // Store
  const { user } = useAuthStore();
  const {
    currentRoom, setRoomMinimized, setKeepRoomAlive,
    keepRoomAlive, isHost, isModerator, isLoading, fetchRoom,
    voiceStage, setVoiceStage,
  } = useRoomStore();
  const {
    currentSong, isPlaying, currentTime, volume,
    setCurrentSong, setIsPlaying, setCurrentTime, setVolume,
  } = usePlayerStore();

  const activeRoomId = currentRoom?._id?.toString?.() || currentRoom?.inviteCode?.toString?.() || roomId;
  const myVoiceSlot = useMemo<'slot1' | 'slot2' | null>(() => {
    if (voiceStage.slots.slot1 && user?._id && voiceStage.slots.slot1 === user._id) return 'slot1';
    if (voiceStage.slots.slot2 && user?._id && voiceStage.slots.slot2 === user._id) return 'slot2';
    return null;
  }, [user?._id, voiceStage.slots.slot1, voiceStage.slots.slot2]);
  const isInVoiceStage = Boolean(myVoiceSlot);

  const {
    isRequestingMic, isMicEnabled, permissionError, voiceLevel,
    isVoiceActive, remoteAudioBlocked, unlockRemoteAudio, startMic, stopMic,
  } = useVoiceChat({ roomId: activeRoomId, active: true, isInVoiceStage });

  // Local state
  const [playMode, setPlayMode] = useState<PlayMode>('live');
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);
  const [listeningHistory, setListeningHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>('queue');
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Array<{ _id: string; name: string; color?: string }>>([]);
  const [playlistBusy, setPlaylistBusy] = useState(false);
  const [pendingVoiceSlot, setPendingVoiceSlot] = useState<'slot1' | 'slot2' | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  // Refs
  const playModeRef = useRef(playMode);
  const shouldSkipSync = useRef(keepRoomAlive);
  const currentTimeRef = useRef(currentTime);
  const currentSongKeyRef = useRef<string | undefined>(currentSong?._id || currentSong?.sourceId);

  useEffect(() => { playModeRef.current = playMode; }, [playMode]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { currentSongKeyRef.current = currentSong?._id || currentSong?.sourceId; }, [currentSong?._id, currentSong?.sourceId]);

  useEffect(() => {
    if (!roomId) return;
    const sameRoom = currentRoom?._id?.toString() === roomId || currentRoom?.inviteCode?.toString() === roomId;
    if (!sameRoom && !isLoading) fetchRoom(roomId);
  }, [currentRoom?._id, currentRoom?.inviteCode, fetchRoom, isLoading, roomId]);

  useEffect(() => {
    if (!playSongId || playSyncRef.current === playSongId) return;
    playSyncRef.current = playSongId;
    shouldSkipSync.current = false;
    const fetchAndSetSong = async () => {
      try {
        const songRes = await songAPI.getSong(playSongId);
        const song = songRes.data?.data?.song;
        if (song) {
          setCurrentSong({ ...song, title: song.title || 'Unknown title', duration: Number(song.duration || 0) });
          setCurrentTime(0);
          setIsPlaying(true);
        }
      } catch (err) {
        console.warn('[room] Không thể tải bài hát từ play query', err);
      }
    };
    fetchAndSetSong();
    emitRequestSync(getSocket(), roomId);
  }, [playSongId, roomId, setCurrentSong, setCurrentTime, setIsPlaying]);

  // Derived
  const canControl = useMemo(() => isHost || isModerator, [isHost, isModerator]);
  const roomSettings = useMemo(() => (currentRoom as any)?.settings || {}, [currentRoom]);
  const isChatEnabled = roomSettings.allowChat !== false;
  const isDjMode = roomSettings.djMode === true;
  const canControlPlay = useMemo(() => playMode === 'live' ? isHost : true, [isHost, playMode]);
  const currentSongId = useMemo(
    () => currentSong?._id?.toString?.() || currentSong?.id?.toString?.() || '',
    [currentSong],
  );

  const shouldApplyLiveSync = useCallback(() => playModeRef.current === 'live', []);
  const coerceSong = useCallback((song: any) => {
    if (!song) return null;
    return { ...song, title: song.title || 'Unknown title', duration: Number(song.duration || 0) };
  }, []);
  const matchesRequestedPlaySong = useCallback((song: any) => {
    if (!playSongId || !song) return true;
    const key = song?._id?.toString?.() || song?.id?.toString?.() || song?.sourceId?.toString?.();
    return key === playSongId;
  }, [playSongId]);
  const shouldIgnoreStaleZeroTime = useCallback((incomingSong: any, incomingTime: number, incomingIsPlaying = true) => {
    if (!incomingIsPlaying) return false;
    const incomingKey = incomingSong?._id || incomingSong?.sourceId;
    const currentKey = currentSongKeyRef.current;
    return Boolean(incomingKey && currentKey && incomingKey === currentKey && currentTimeRef.current > 2 && incomingTime <= 1);
  }, []);

  // ── Socket ──
  const { chatMessages, sendMessage, doJoinRoom } = useRoomSocket(roomId, {
    onRoomState: (payload) => {
      if (shouldSkipSync.current) { shouldSkipSync.current = false; return; }
      if (!shouldApplyLiveSync()) return;
      const pb = payload.playback || payload.room?.playback;
      if (!pb) return;
      if (playSongId && pb.currentSong && !matchesRequestedPlaySong(pb.currentSong)) return;
      setCurrentSong(coerceSong(pb.currentSong));
      if (typeof pb.currentTime === 'number' && !Number.isNaN(pb.currentTime))
        if (!shouldIgnoreStaleZeroTime(pb.currentSong, pb.currentTime, !!pb.isPlaying))
          setCurrentTime(pb.currentTime);
      setIsPlaying(!!pb.isPlaying);
    },
    onPlaybackSync: (data) => {
      if (shouldSkipSync.current || !shouldApplyLiveSync()) return;
      if (playSongId && data.currentSong && !matchesRequestedPlaySong(data.currentSong)) return;
      if (data.currentSong) setCurrentSong(coerceSong(data.currentSong));
      if (typeof data.currentTime === 'number' && !Number.isNaN(data.currentTime)) setCurrentTime(data.currentTime);
      setIsPlaying(!!data.isPlaying);
    },
    onSongChanged: (data) => {
      if (!shouldApplyLiveSync()) return;
      if (playSongId && data.song && !matchesRequestedPlaySong(data.song)) return;
      if (data.song) setCurrentSong(coerceSong(data.song));
      if (typeof data.currentTime === 'number' && !Number.isNaN(data.currentTime)) setCurrentTime(data.currentTime);
      if (typeof data.isPlaying === 'boolean') setIsPlaying(!!data.isPlaying);
      emitRequestSync(getSocket(), roomId);
    },
    onSyncResponse: (data) => {
      if (shouldSkipSync.current || !shouldApplyLiveSync()) return;
      if (playSongId && data.currentSong && !matchesRequestedPlaySong(data.currentSong)) return;
      if (data.currentSong) setCurrentSong(coerceSong(data.currentSong));
      if (typeof data.currentTime === 'number' && !Number.isNaN(data.currentTime)) setCurrentTime(data.currentTime);
      setIsPlaying(!!data.isPlaying);
    },
    onRoomUpdated: (payload) => {
      if (!shouldApplyLiveSync()) return;
      const pb = payload.room?.playback;
      if (!pb) return;
      if (playSongId && pb.currentSong && !matchesRequestedPlaySong(pb.currentSong)) return;
      if (pb.currentSong) setCurrentSong(coerceSong(pb.currentSong));
      if (typeof pb.currentTime === 'number' && !Number.isNaN(pb.currentTime))
        if (!shouldIgnoreStaleZeroTime(pb.currentSong, pb.currentTime, !!pb.isPlaying))
          setCurrentTime(pb.currentTime);
      setIsPlaying(!!pb.isPlaying);
    },
    onVoiceState: (payload) => {
      setVoiceStage({ slots: payload.slots, speaking: payload.speaking });
      setPendingVoiceSlot(null);
      const mine = user?._id && (payload.slots.slot1 === user._id || payload.slots.slot2 === user._id);
      if (mine) addToast('Đã lên vị trí mic', 'success');
    },
    onVoiceError: (payload) => { setPendingVoiceSlot(null); addToast(payload.message, 'warning'); },
  });

  // ── Queue / Search ──
  const {
    activeQueue, personalQueue, setPersonalQueue,
    handleAddToQueue, handlePlaySong,
    searchQuery, setSearchQuery, officialOnly, setOfficialOnly,
    searchResults, isSearching, hasMoreSearchResults,
    isLoadingMoreSearchResults, searchError,
    handleSearchSongs, loadMoreSearchSongs,
  } = useRoomQueue({
    roomId, currentRoom, playMode, canControl, user,
    socket: getSocket(), fetchRoom,
    setCurrentSong, setIsPlaying, setCurrentTime,
    currentSong, isPlaying, repeatMode,
  });

  // ── Playback ──
  const { handlePlayPause, handleSeek } = usePlayback({
    roomId, playMode, canControlPlay, currentSong, currentTime,
    isPlaying, setCurrentTime, setIsPlaying, socket: getSocket(),
  });

  const handleRequestVoiceSlot = useCallback(async (slotKey: 'slot1' | 'slot2') => {
    if (pendingVoiceSlot) return;
    setPendingVoiceSlot(slotKey);
    addToast('Đang xin lên vị trí mic...', 'info');
    await doJoinRoom();
    emitVoiceJoinSlot(getSocket(), activeRoomId);
  }, [activeRoomId, addToast, doJoinRoom, pendingVoiceSlot]);

  const switchToFreeMode = useCallback(() => {
    playModeRef.current = 'free';
    shouldSkipSync.current = true;
    setPlayMode('free');
  }, []);

  const handleSkipForward = useCallback(() => {
    if (playMode === 'live') {
      if (canControlPlay) getSocket().emit('skip' as any, { roomId });
      return;
    }
    if (!personalQueue.length) {
      if (repeatMode === 'one' && currentSong) { setCurrentTime(0); setIsPlaying(true); return; }
      setCurrentSong(null); setIsPlaying(false); return;
    }
    const [next, ...rest] = personalQueue;
    setPersonalQueue(rest);
    setCurrentSong(next);
    setCurrentTime(0);
    setIsPlaying(true);
  }, [canControlPlay, currentSong, personalQueue, playMode, repeatMode, roomId, setCurrentSong, setCurrentTime, setIsPlaying, setPersonalQueue]);

  const handleSkipBackward = useCallback(() => handleSeek(0), [handleSeek]);

  const handlePlayPauseClick = useCallback(() => {
    if (!currentSong) return;
    if (playMode === 'live' && !canControlPlay) return;
    handlePlayPause();
  }, [canControlPlay, currentSong, handlePlayPause, playMode]);

  const handlePlayFromList = useCallback((song: any, index?: number) => {
    if (!song) return;
    const normalized = {
      ...song,
      _id: song._id || song.sourceId,
      sourceId: song.sourceId || song._id,
      source: song.source || 'youtube',
      duration: Number(song.duration || 0),
    };
    if (playMode === 'live' && !canControlPlay) return;
    handlePlaySong(normalized, index);
  }, [canControlPlay, handlePlaySong, playMode]);

  useEffect(() => {
    let cancelled = false;
    if (!currentSongId || !user?._id) { setLiked(false); setPlaylistOpen(false); return; }
    songAPI.getLikeStatus(currentSongId)
      .then((res) => { if (!cancelled) setLiked(Boolean(res.data?.data?.liked)); })
      .catch(() => { if (!cancelled) setLiked(false); });
    return () => { cancelled = true; };
  }, [currentSongId, user?._id]);

  const handleToggleLike = useCallback(async () => {
    if (!currentSongId) return addToast('Chưa có bài hát để thích', 'warning');
    if (!user?._id) return addToast('Bạn cần đăng nhập để thích bài hát', 'warning');
    setLikeBusy(true);
    try {
      if (liked) { await songAPI.unlikeSong(currentSongId); setLiked(false); addToast('Đã bỏ thích bài hát', 'info'); }
      else { await songAPI.likeSong(currentSongId); setLiked(true); addToast('Đã thích bài hát', 'success'); }
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Không thể cập nhật yêu thích', 'error');
    } finally { setLikeBusy(false); }
  }, [addToast, currentSongId, liked, user?._id]);

  const handleTogglePlaylist = useCallback(async () => {
    if (!currentSongId) return addToast('Chưa có bài hát để thêm playlist', 'warning');
    if (!user?._id) return addToast('Bạn cần đăng nhập để thêm playlist', 'warning');
    const nextOpen = !playlistOpen;
    setPlaylistOpen(nextOpen);
    if (!nextOpen || playlists.length > 0) return;
    setPlaylistBusy(true);
    try {
      const res = await playlistAPI.getUserPlaylists('me');
      setPlaylists(res.data?.data?.playlists || []);
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Không tải được playlist', 'error');
      setPlaylistOpen(false);
    } finally { setPlaylistBusy(false); }
  }, [addToast, currentSongId, playlistOpen, playlists.length, user?._id]);

  const handleAddToPlaylist = useCallback(async (playlistId: string) => {
    if (!currentSongId) return;
    setPlaylistBusy(true);
    try {
      await playlistAPI.addSongToPlaylist(playlistId, currentSongId);
      addToast('Đã thêm vào playlist', 'success');
      setPlaylistOpen(false);
    } catch (error: any) {
      const raw = error?.response?.data?.message || '';
      addToast(raw.includes('already') ? 'Bài hát đã có trong playlist' : raw || 'Không thể thêm vào playlist', 'warning');
    } finally { setPlaylistBusy(false); }
  }, [addToast, currentSongId]);

  // ── Room settings ──
  const handleToggleRoomSetting = useCallback(async (next: Record<string, any>) => {
    if (!currentRoom?._id || !canControl || isUpdatingRoom) return;
    setIsUpdatingRoom(true);
    try {
      await roomService.updateRoom(currentRoom._id, { settings: { ...roomSettings, ...next } });
      await fetchRoom(roomId);
    } finally { setIsUpdatingRoom(false); }
  }, [canControl, currentRoom?._id, fetchRoom, isUpdatingRoom, roomId, roomSettings]);

  const handleToggleChatLock = useCallback(() => handleToggleRoomSetting({ allowChat: !isChatEnabled }), [handleToggleRoomSetting, isChatEnabled]);
  const handleToggleDjMode = useCallback(() => {
    const next = !isDjMode;
    setPlayMode(next ? 'live' : 'free');
    handleToggleRoomSetting({ djMode: next });
  }, [handleToggleRoomSetting, isDjMode]);

  const handleOpenRoomSettings = useCallback(() => {
    const next = window.prompt('Tên phòng', currentRoom?.name || '');
    if (next?.trim() && next.trim() !== currentRoom?.name)
      roomService.updateRoom(currentRoom!._id, { name: next.trim() }).then(() => fetchRoom(roomId));
  }, [currentRoom, fetchRoom, roomId]);

  const handleSendChat = useCallback(async () => {
    if (!isChatEnabled && !canControl) return;
    const content = chatInput.trim();
    if (!content) return;
    setIsSendingChat(true);
    try { sendMessage(content, 'text'); setChatInput(''); }
    finally { setIsSendingChat(false); }
  }, [canControl, chatInput, isChatEnabled, sendMessage]);

  // ── Member list ──
  const memberList = useMemo(() => {
    const host = currentRoom?.host;
    const mods = (currentRoom?.moderators || []).map((m: any) => ({ user: m, role: 'Co-host' }));
    const guests = (currentRoom?.participants || []).map((p: any) => ({ user: p.user, role: 'Thành viên' }));
    const all = [
      ...(host ? [{ user: host, role: 'Chủ phòng' }] : []),
      ...mods,
      ...guests,
    ];
    const activeIds: string[] = (currentRoom as any)?.activeParticipantIds || [];
    const seen = new Set<string>();
    return all.filter((item) => {
      const id = (item.user?._id || item.user?.id || item.user?.username)?.toString();
      const isOnline = activeIds.includes(id ?? '') || item.role === 'Chủ phòng';
      if (!id || seen.has(id) || !isOnline) return false;
      seen.add(id);
      return true;
    });
  }, [currentRoom]);

  // ── History ──
  useEffect(() => {
    let mounted = true;
    setIsHistoryLoading(true);
    roomService.getRoomHistory(roomId)
      .then((res) => { if (mounted) setListeningHistory(res?.data?.data?.history || []); })
      .catch(() => { if (mounted) setListeningHistory([]); })
      .finally(() => { if (mounted) setIsHistoryLoading(false); });
    return () => { mounted = false; };
  }, [roomId, currentSong?._id]);

  // ── Cleanup ──
  useEffect(() => () => {
    setKeepRoomAlive(true);
    setRoomMinimized(true);
  }, [setKeepRoomAlive, setRoomMinimized]);

  // ── Derived display values ──
  const duration = Number(currentSong?.duration || 0);
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const roomCode = currentRoom?.inviteCode || roomId || currentRoom?._id || '';
  const heroArtwork = currentSong?.coverArt || currentSong?.thumbnail || FALLBACK_ART;
  const songTitle = currentSong ? getSongTitle(currentSong) : 'Chưa có bài hát';
  const songArtist = currentSong ? (getSongMeta(currentSong) || 'Nghệ sĩ') : 'Thêm bài từ tab tìm kiếm';

  const {
    lyrics, lyricIdx, prevLine, curLine, nextLine, linePct,
    lyricFetching, lyricsStatus, lrcInputRef, handleLrcFile, retryLyrics,
  } = useLyrics(currentSong, currentTime);

  const currentLyricsStatus = typeof lyricsStatus === 'string'
    ? lyricsStatus
    : (currentSong ? lyricsStatus[String(currentSong._id || currentSong.sourceId || '')] : undefined);

  const chatDisabled = isSendingChat || (!isChatEnabled && !canControl);

  // Whether to show the search panel as full-width overlay
  const isSearchOpen = activePanel === 'search';
  const isLyricsOpen = activePanel === 'lyrics';

  if (!currentRoom) {
    return <div className="room-loading"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="room-page">

      {/* ── Hero banner ── */}
      <section
        className="rp-hero"
        style={{ '--hero-bg': `url(${heroArtwork})` } as CSSProperties}
      >
        <div className="rp-hero-overlay" />
        <div className="rp-hero-content">
          <h1 className="rp-room-name">{currentRoom?.name || 'Phòng nghe nhạc'}</h1>
          <div className="rp-room-meta">
            <span className="rp-room-id">ID: {roomCode}</span>
            <button
              type="button"
              className="rp-copy-btn"
              onClick={() => navigator.clipboard?.writeText(roomCode)}
              aria-label="Sao chép mã phòng"
            >⧉</button>
          </div>
          <div className="rp-badges">
            <span className="rp-badge live"><i className="rp-pulse" />LIVE</span>
            <span className="rp-badge listeners">👥 {memberList.length} người nghe</span>
            <span className="rp-badge mode">{playMode === 'live' ? '⏳ Live' : '🔓 Free'}</span>
          </div>
        </div>
      </section>

      {/* ── Main layout ── */}
      <div className="rp-layout">

        {/* LEFT COLUMN */}
        <div className="rp-left">

          {/* ── Player card ── */}
          <section
            className="rp-player rp-player--cinema"
            style={{ '--hero-bg': `url(${heroArtwork})`, '--pct': `${Math.max(0, Math.min(100, progressPct))}%` } as CSSProperties}
          >
            <div className="rp-player-bg" />
            <div className="rp-player-vignette" />
            <div className="rp-player-inner rp-player-inner--cinema">

              {/* Album art */}
              <div className="rp-album-stage">
                <img className="rp-album rp-album--large" src={heroArtwork} alt={songTitle} />
              </div>

              {/* Info + controls */}
              <div className="rp-nowplay-stage">
                <p className="rp-song-kicker">{songArtist}</p>
                <h2 className="rp-song-title rp-song-title--compact">{songTitle}</h2>

                {/* Karaoke lyrics */}
                <div className="rp-karaoke" aria-live="polite">
                  {lyrics.length > 0 ? (
                    <div className="rp-lyric-slots">
                      <p
                        className={`rp-lyric-line rp-lyric-slot ${lyricIdx % 2 === 0 ? 'rp-lyric-line--active' : 'rp-lyric-line--next'}`}
                        style={lyricIdx % 2 === 0 ? ({ '--line-pct': linePct } as CSSProperties) : undefined}
                      >
                        {lyricIdx % 2 === 0
                          ? (curLine?.text || lyrics[Math.max(0, lyricIdx)]?.text || '...')
                          : (nextLine?.text || '')}
                      </p>
                      <p
                        className={`rp-lyric-line rp-lyric-slot ${lyricIdx % 2 === 1 ? 'rp-lyric-line--active' : 'rp-lyric-line--next'}`}
                        style={lyricIdx % 2 === 1 ? ({ '--line-pct': linePct } as CSSProperties) : undefined}
                      >
                        {lyricIdx % 2 === 1
                          ? (curLine?.text || lyrics[Math.max(0, lyricIdx)]?.text || '...')
                          : (nextLine?.text || '')}
                      </p>
                    </div>
                  ) : (
                    <div className="rp-lyrics-empty-inline">
                      <strong>{lyricFetching ? 'Đang tìm lời bài hát...' : 'Chưa có lời bài hát'}</strong>
                      <span>
                        {currentLyricsStatus === 'not_found'
                          ? 'Không tìm thấy lời tự động, hãy tải file LRC.'
                          : currentLyricsStatus === 'error'
                            ? 'Có lỗi khi tải lời, thử làm mới.'
                            : 'Lời bài hát sẽ hiện ở đây giống karaoke.'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress */}
                <div className="rp-cinema-progress">
                  <span>{fmt(currentTime)}</span>
                  <label className="rp-progress-bar rp-progress-bar--interactive" aria-label="Tiến trình phát nhạc">
                    <div className="rp-progress-fill" />
                    <div className="rp-progress-thumb" />
                    <input
                      className="rp-progress-input"
                      type="range"
                      min="0"
                      max={duration > 0 ? duration : 100}
                      step="1"
                      value={duration > 0 ? Math.min(currentTime, duration) : 0}
                      onChange={(e) => handleSeek(Number(e.target.value))}
                      disabled={!currentSong || !canControlPlay}
                    />
                  </label>
                  <span>{duration > 0 ? fmt(duration) : '--:--'}</span>
                </div>

                {/* Controls */}
                <div className="rp-controls rp-controls--cinema">
                  <button
                    type="button"
                    className={`rp-ctrl-btn rp-volume-btn${volume === 0 ? ' muted' : ''}`}
                    aria-label={volume === 0 ? 'Bật âm lượng' : 'Tắt âm lượng'}
                    onClick={() => setVolume(volume === 0 ? 70 : 0)}
                  >
                    {volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
                  </button>
                  <button
                    type="button"
                    className={`rp-ctrl-btn rp-favorite-btn${liked ? ' active liked' : ''}`}
                    aria-label={liked ? 'Bỏ thích' : 'Thích'}
                    onClick={handleToggleLike}
                    disabled={!currentSongId || likeBusy}
                  >
                    {liked ? '♥' : '♡'}
                  </button>
                  <div className="rp-playlist-wrap">
                    <button
                      type="button"
                      className={`rp-ctrl-btn rp-playlist-btn${playlistOpen ? ' active' : ''}`}
                      aria-label="Thêm vào playlist"
                      onClick={handleTogglePlaylist}
                      disabled={!currentSongId || playlistBusy}
                    >＋</button>
                    {playlistOpen && (
                      <div className="rp-playlist-menu">
                        <strong>Thêm vào playlist</strong>
                        {playlistBusy ? (
                          <span className="rp-playlist-empty">Đang tải...</span>
                        ) : playlists.length === 0 ? (
                          <span className="rp-playlist-empty">Bạn chưa có playlist</span>
                        ) : playlists.map((pl) => (
                          <button key={pl._id} type="button" onClick={() => handleAddToPlaylist(pl._id)}>
                            <i style={{ background: pl.color || '#f5a623' }} />
                            <span>{pl.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="button" className="rp-ctrl-btn" aria-label="Trước" onClick={handleSkipBackward} disabled={!canControlPlay}>⏮</button>
                  <button
                    type="button"
                    className="rp-ctrl-btn rp-play-btn rp-play-btn--outline"
                    aria-label={isPlaying ? 'Dừng' : 'Phát'}
                    onClick={handlePlayPauseClick}
                    disabled={!currentSong || !canControlPlay}
                  >
                    <span>{isPlaying ? '⏸' : '▶'}</span>
                  </button>
                  <button type="button" className="rp-ctrl-btn" aria-label="Tiếp" onClick={handleSkipForward} disabled={!canControlPlay}>⏭</button>
                  <button
                    type="button"
                    className={`rp-ctrl-btn${repeatMode !== 'off' ? ' active' : ''}`}
                    aria-label="Lặp lại"
                    onClick={() => setRepeatMode(repeatMode === 'off' ? 'one' : 'off')}
                  >🔁</button>
                  <button type="button" className="rp-bitrate-pill" aria-label="Chất lượng âm thanh">128K</button>
                </div>

                <div className="rp-lyrics-actions">
                  <button type="button" onClick={() => currentSong && retryLyrics()} disabled={!currentSong || lyricFetching}>
                    {lyricFetching ? 'Đang tìm...' : 'Làm mới lời'}
                  </button>
                  <button type="button" onClick={() => lrcInputRef.current?.click()} disabled={!currentSong}>Tải LRC</button>
                </div>
                <input ref={lrcInputRef} type="file" accept=".lrc,text/plain" className="hidden" onChange={handleLrcFile} />
              </div>
            </div>
          </section>

          {/* ── Main Panels (Queue, History, Search, Lyrics) ── */}
          <div className="rp-panel-row">
            {/* LEFT PANEL: Queue OR Search */}
            <section className="rp-panel">
              <div className="rp-panel-head">
                <h3>
                  {isSearchOpen ? 'Tìm kiếm' : 'Hàng đợi'}
                  <span className="rp-panel-count">
                    {isSearchOpen ? searchResults.length : activeQueue.length}
                  </span>
                </h3>
                <button
                  type="button"
                  className={isSearchOpen ? 'rp-back-btn' : 'rp-add-btn'}
                  onClick={() => setActivePanel(isSearchOpen ? 'queue' : 'search')}
                >
                  {isSearchOpen ? '← Quay lại' : '＋ Tìm bài'}
                </button>
              </div>
              <div className="rp-panel-body">
                {isSearchOpen ? (
                  <SearchPanel
                    activePanel="search"
                    searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                    officialOnly={officialOnly} setOfficialOnly={setOfficialOnly}
                    isSearching={isSearching} isLoadingMoreSearchResults={isLoadingMoreSearchResults}
                    hasMoreSearchResults={hasMoreSearchResults} searchError={searchError}
                    searchResults={searchResults} onSearch={handleSearchSongs}
                    onLoadMore={loadMoreSearchSongs} onAddToQueue={handleAddToQueue}
                  />
                ) : (
                  activeQueue.length > 0
                    ? activeQueue.map((song: any, idx: number) => {
                      const key = song._id || song.sourceId;
                      const currentKey = currentSong?._id || currentSong?.sourceId;
                      return (
                        <SongRow
                          key={`${key || 'song'}-${idx}`}
                          song={song}
                          index={idx}
                          isCurrent={Boolean(key && key === currentKey)}
                          onPlay={handlePlayFromList}
                          onAdd={handleAddToQueue}
                        />
                      );
                    })
                    : <div className="rp-empty">Danh sách chờ trống</div>
                )}
              </div>
            </section>

            {/* RIGHT PANEL: History OR Lyrics */}
            <section className="rp-panel">
              <div className="rp-panel-head">
                <h3>
                  {isLyricsOpen ? 'Lời bài hát' : 'Lịch sử'}
                  <span className="rp-panel-count">
                    {isLyricsOpen ? lyrics.length : listeningHistory.length}
                  </span>
                </h3>
                <button
                  type="button"
                  className={isLyricsOpen ? 'rp-back-btn' : 'rp-add-btn'}
                  onClick={() => setActivePanel(isLyricsOpen ? 'queue' : 'lyrics')}
                >
                  {isLyricsOpen ? '← Quay lại' : '🎤 Lời'}
                </button>
              </div>
              <div className="rp-panel-body">
                {isLyricsOpen ? (
                  <Lyrics lyrics={lyrics} currentTime={currentTime} />
                ) : (
                  isHistoryLoading
                    ? <div className="rp-empty">Đang tải...</div>
                    : listeningHistory.length > 0
                      ? [...listeningHistory].reverse().map((item: any, idx: number) => (
                        <SongRow
                          key={item?._id || idx}
                          song={item?.song || {}}
                          index={idx}
                          onPlay={handlePlayFromList}
                          onAdd={handleAddToQueue}
                        />
                      ))
                      : <div className="rp-empty">Chưa có lịch sử</div>
                )}
              </div>
            </section>
          </div>

          {/* ── Voice Stage ── */}
          <section className="rp-voice-stage">
            <div className="rp-voice-head">
              <div>
                <span className="rp-chat-kicker">Voice stage</span>
                <h3 className="rp-section-title">2 vị trí bật mic</h3>
              </div>
              <div className="rp-voice-actions">
                <button
                  type="button"
                  className="rp-action-btn"
                  onClick={() => {
                    setPendingVoiceSlot(null);
                    stopMic();
                    emitVoiceLeaveSlot(getSocket(), activeRoomId);
                  }}
                >
                  Rời vị trí
                </button>
              </div>
            </div>

            <div className="rp-voice-grid">
              {([
                { key: 'slot1', label: 'Vị trí 1' },
                { key: 'slot2', label: 'Vị trí 2' },
              ] as const).map(({ key, label }) => {
                const userId = voiceStage.slots[key];
                const isMine = user?._id && userId === user._id;
                const isSpeaking = isMine && voiceStage.speaking.includes(userId || '');
                const isPending = pendingVoiceSlot === key;
                const isOccupied = Boolean(userId);
                return (
                  <button
                    key={key}
                    type="button"
                    className={[
                      'rp-voice-slot',
                      isMine ? 'mine' : '',
                      isSpeaking ? 'speaking' : '',
                      isOccupied && !isMine ? 'occupied' : '',
                      isPending ? 'pending' : '',
                      isMine && isVoiceActive ? 'voice-active' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => { if (!isOccupied) void handleRequestVoiceSlot(key); }}
                    disabled={(isOccupied && !isMine) || Boolean(pendingVoiceSlot)}
                    style={isMine && isVoiceActive ? ({ ['--voice-level' as any]: Math.max(0.2, voiceLevel).toFixed(2) } as any) : undefined}
                  >
                    <span className="rp-voice-slot-label">{label}</span>
                    <strong className="rp-voice-slot-name">
                      {isPending ? 'Đang lên...' : userId ? (isMine ? 'Bạn' : 'Có người') : 'Trống'}
                    </strong>
                    <small>
                      {isPending ? 'Đang gửi yêu cầu...'
                        : isMine ? 'Bật mic để nói'
                          : isOccupied ? 'Đã có người'
                            : 'Nhấn để lên vị trí'}
                    </small>
                    {isMine && isMicEnabled && (
                      <div className="rp-voice-meter" aria-hidden="true">
                        <span /><span /><span /><span /><span />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="rp-voice-micbar">
              <button
                type="button"
                className="rp-room-btn"
                onClick={async () => { if (!isInVoiceStage) return; if (!isMicEnabled) await startMic(); }}
                disabled={!isInVoiceStage || isRequestingMic || Boolean(permissionError)}
              >
                {isRequestingMic ? 'Đang bật mic...' : isMicEnabled ? '🎙 Mic đang bật' : '🎙 Bật mic'}
              </button>
              <button
                type="button"
                className="rp-room-btn"
                onClick={() => stopMic()}
                disabled={!isMicEnabled && !isRequestingMic}
              >
                🔇 Tắt mic
              </button>
            </div>

            {permissionError && <div className="rp-empty">{permissionError}</div>}
            {remoteAudioBlocked && (
              <button type="button" className="rp-room-btn" onClick={() => void unlockRemoteAudio()}>
                🔊 Bấm để nghe voice của người khác
              </button>
            )}
            {isMicEnabled && (
              <div className="rp-empty" style={{ padding: '8px 0 0', fontStyle: 'normal', fontSize: 12 }}>
                Mic đã bật {isVoiceActive ? '· đang nói' : '· chờ giọng nói'}
              </div>
            )}
          </section>

          {/* ── Room controls (host/mod only) ── */}
          {canControl && (
            <section className="rp-room-controls">
              <h3 className="rp-section-title">Điều khiển phòng</h3>
              <div className="rp-ctrl-grid">
                {[
                  { icon: '🎙', label: isMicMuted ? 'Bật mic' : 'Tắt mic', active: isMicMuted, onClick: () => setIsMicMuted((v) => !v), disabled: false },
                  { icon: '💬', label: isChatEnabled ? 'Tắt chat' : 'Bật chat', active: !isChatEnabled, danger: !isChatEnabled, onClick: handleToggleChatLock, disabled: isUpdatingRoom },
                  { icon: '🎧', label: isDjMode ? 'Tắt DJ' : 'DJ mode', active: isDjMode, onClick: handleToggleDjMode, disabled: isUpdatingRoom },
                  { icon: '⏳', label: playMode === 'live' ? 'Live' : 'Free', active: playMode === 'live', onClick: () => setPlayMode(playMode === 'live' ? 'free' : 'live'), disabled: false },
                  { icon: '⚙', label: 'Cài đặt', active: false, onClick: handleOpenRoomSettings, disabled: false },
                ].map(({ icon, label, active, danger, onClick, disabled }) => (
                  <button
                    key={label}
                    type="button"
                    className={`rp-room-btn${active ? ' active' : ''}${danger ? ' danger' : ''}`}
                    onClick={onClick}
                    disabled={disabled}
                  >
                    <span className="rp-room-btn-icon">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Quick actions ── */}
          <div className="rp-quick-actions">
            <button type="button" className="rp-action-btn">👥 Mời bạn</button>
            <button type="button" className="rp-action-btn">🔗 Chia sẻ</button>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="rp-right">

          {/* Chat */}
          <section className="rp-chat">
            <div className="rp-chat-head">
              <div>
                <span className="rp-chat-kicker">Live room</span>
                <h3 className="rp-section-title">Trò chuyện</h3>
              </div>
              <span className="rp-chat-pill">{chatMessages.length} tin</span>
            </div>
            <div className="rp-chat-list">
              {chatMessages.length > 0
                ? chatMessages.slice(-20).map((msg: any, idx: number) => (
                  <ChatBubble key={msg._id || idx} msg={msg} idx={idx} />
                ))
                : (
                  <div className="rp-chat-empty">
                    <span>💬</span>
                    <strong>Chưa có tin nhắn</strong>
                    <p>Hãy bắt đầu cuộc trò chuyện trong phòng nhạc này.</p>
                  </div>
                )
              }
            </div>
            <div className="rp-chat-input">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                placeholder={isChatEnabled || canControl ? 'Nhập tin nhắn...' : 'Chat đang bị tắt'}
                disabled={chatDisabled}
                maxLength={300}
              />
              <button
                type="button"
                onClick={handleSendChat}
                disabled={chatDisabled || !chatInput.trim()}
                aria-label="Gửi"
              ><span>➤</span></button>
            </div>
          </section>

          {/* Members */}
          <section className="rp-members">
            <div className="rp-members-head">
              <h3 className="rp-section-title">
                Người tham gia <span className="rp-panel-count">{memberList.length}</span>
              </h3>
            </div>
            <div className="rp-member-list">
              {memberList.length > 0
                ? memberList.map((item: any, idx: number) => (
                  <MemberRow key={item.user?._id || item.user?.username || idx} item={item} idx={idx} />
                ))
                : <div className="rp-empty">Chưa có ai online</div>
              }
            </div>
          </section>

        </aside>
      </div>
    </div>
  );
}