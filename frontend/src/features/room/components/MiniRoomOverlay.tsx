'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import {
  Heart,
  ListMusic,
  ListPlus,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { useRoomStore } from '@/store/roomStore';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import { getSocket } from '@/lib/socket';
import { emitPause, emitPlay, emitSeek, emitSkip } from '@/socket/emitters';
import { formatDuration } from '@/lib/utils';
import { playlistAPI, songAPI } from '@/shared/lib/api';

type PlaylistOption = {
  _id: string;
  name: string;
  songs?: Array<{ _id?: string } | string>;
  color?: string;
};

const getSongId = (song: any) => song?._id?.toString?.() || song?.id?.toString?.() || '';

export default function MiniRoomOverlay() {
  const pathname = usePathname();
  const router = useRouter();
  const currentRoom = useRoomStore((s) => s.currentRoom);
  const isRoomMinimized = useRoomStore((s) => s.isRoomMinimized);
  const keepRoomAlive = useRoomStore((s) => s.keepRoomAlive);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const { user, isAuthenticated } = useAuthStore((s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }));
  const addToast = useToastStore((s) => s.addToast);

  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([]);
  const [playlistBusy, setPlaylistBusy] = useState(false);

  const songId = useMemo(() => getSongId(currentSong), [currentSong]);
  const isHostActual = currentRoom?.host?._id?.toString() === user?._id?.toString();
  const isModerator = Boolean(
    currentRoom?.moderators?.some(
      (m: any) => (m?._id?.toString?.() || m?.toString()) === user?._id?.toString(),
    ),
  );
  const canControlPlayback = Boolean(isHostActual || isModerator);
  const duration = Number(currentSong?.duration) || 0;
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    let cancelled = false;
    if (!songId || !user?._id) {
      setLiked(false);
      return;
    }

    songAPI.getLikeStatus(songId)
      .then((res) => {
        if (!cancelled) setLiked(Boolean(res.data?.data?.liked));
      })
      .catch(() => {
        if (!cancelled) setLiked(false);
      });

    return () => {
      cancelled = true;
    };
  }, [songId, user?._id]);

  const isAuthRoute = pathname === '/login' || pathname === '/register';
  if (!isAuthenticated || !user || isAuthRoute || !currentRoom || !currentSong || !songId || !(isRoomMinimized || keepRoomAlive) || pathname.startsWith('/room/')) return null;

  const roomRoute = `/room/${currentRoom.inviteCode || currentRoom._id}`;

  const handlePlayPause = () => {
    if (!canControlPlayback || !currentRoom?._id) return;
    if (isPlaying) emitPause(getSocket(), currentRoom._id, currentTime);
    else emitPlay(getSocket(), currentRoom._id, currentTime);
  };

  const handleSkip = () => {
    if (!canControlPlayback || !currentRoom?._id) return;
    emitSkip(getSocket(), currentRoom._id);
  };

  const handleSeek = (value: number) => {
    if (!canControlPlayback || !currentRoom?._id || duration <= 0) return;
    emitSeek(getSocket(), currentRoom._id, value);
  };

  const handleToggleLike = async () => {
    if (!songId) return addToast('Chưa có bài hát để thích', 'warning');
    if (!user?._id) return addToast('Bạn cần đăng nhập để thích bài hát', 'warning');
    setLikeBusy(true);
    try {
      if (liked) {
        await songAPI.unlikeSong(songId);
        setLiked(false);
        addToast('Đã bỏ thích bài hát', 'info');
      } else {
        await songAPI.likeSong(songId);
        setLiked(true);
        addToast('Đã thích bài hát', 'success');
      }
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Không thể cập nhật yêu thích', 'error');
    } finally {
      setLikeBusy(false);
    }
  };

  const handleTogglePlaylist = async () => {
    if (!songId) return addToast('Chưa có bài hát để thêm playlist', 'warning');
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
    } finally {
      setPlaylistBusy(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!songId) return;
    setPlaylistBusy(true);
    try {
      await playlistAPI.addSongToPlaylist(playlistId, songId);
      addToast('Đã thêm vào playlist', 'success');
      setPlaylistOpen(false);
    } catch (error: any) {
      const raw = error?.response?.data?.message || '';
      addToast(raw.includes('already') ? 'Bài hát đã có trong playlist' : raw || 'Không thể thêm vào playlist', 'warning');
    } finally {
      setPlaylistBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 28 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="global-mini-player"
        aria-label="Thanh điều khiển nhạc toàn cục"
      >
        <div className="gmp-track-info" onClick={() => router.push(roomRoute)} role="button" tabIndex={0}>
          <div className="gmp-cover">
            {currentSong?.coverArt ? (
              <Image src={currentSong.coverArt} alt={currentSong.title || 'Cover bài hát'} fill sizes="56px" className="gmp-cover-img" />
            ) : (
              <span>♪</span>
            )}
          </div>
          <div className="gmp-song-meta">
            <strong>{currentSong?.title || 'Chưa có bài hát'}</strong>
            <span>{currentSong?.artist || currentRoom.name}</span>
          </div>
        </div>

        <div className="gmp-actions">
          <button type="button" className={`gmp-icon-btn gmp-heart ${liked ? 'active' : ''}`} onClick={handleToggleLike} disabled={likeBusy || !songId} aria-label={liked ? 'Bỏ thích' : 'Yêu thích'}>
            <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
          </button>
          <div className="gmp-playlist-wrap">
            <button type="button" className={`gmp-icon-btn gmp-playlist ${playlistOpen ? 'active' : ''}`} onClick={handleTogglePlaylist} disabled={playlistBusy || !songId} aria-label="Thêm vào playlist">
              <ListPlus size={17} />
            </button>
            {playlistOpen && (
              <div className="gmp-playlist-menu">
                <strong>Thêm vào playlist</strong>
                {playlistBusy ? <span className="gmp-playlist-empty">Đang tải...</span> : playlists.length === 0 ? <span className="gmp-playlist-empty">Bạn chưa có playlist</span> : playlists.map((playlist) => (
                  <button key={playlist._id} type="button" onClick={() => handleAddToPlaylist(playlist._id)}>
                    <i style={{ background: playlist.color || '#f5a623' }} />
                    <span>{playlist.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="gmp-center">
          <div className="gmp-controls">
            <button type="button" className="gmp-icon-btn" aria-label="Trộn bài"><Shuffle size={16} /></button>
            <button type="button" className="gmp-icon-btn" aria-label="Bài trước" disabled={!canControlPlayback}><SkipBack size={17} /></button>
            <button type="button" className="gmp-play-btn" onClick={handlePlayPause} disabled={!canControlPlayback} aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}>
              {isPlaying ? <Pause size={22} /> : <Play size={22} />}
            </button>
            <button type="button" className="gmp-icon-btn" onClick={handleSkip} disabled={!canControlPlayback} aria-label="Bài tiếp"><SkipForward size={17} /></button>
            <button type="button" className="gmp-icon-btn" aria-label="Lặp lại"><Repeat size={16} /></button>
          </div>

          <div className="gmp-progress-row">
            <span>{formatDuration(currentTime)}</span>
            <div className="gmp-progress">
              <input type="range" min={0} max={duration || 0} value={Math.min(currentTime, duration || currentTime)} onChange={(e) => handleSeek(Number(e.target.value))} disabled={!canControlPlayback || duration <= 0} style={{ '--gmp-progress': `${progressPct}%` } as React.CSSProperties} aria-label="Tua bài hát" />
            </div>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        <div className="gmp-right">
          <div className="gmp-volume">
            <Volume2 size={16} />
            <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ '--gmp-volume': `${volume}%` } as React.CSSProperties} aria-label="Âm lượng" />
          </div>
          <button type="button" className="gmp-icon-btn" aria-label="Hàng chờ"><ListMusic size={17} /></button>
          <button type="button" className="gmp-icon-btn" onClick={() => router.push(roomRoute)} aria-label="Mở rộng player"><Maximize2 size={16} /></button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
