import { useCallback, useEffect, useMemo, useState } from 'react';
import { songAPI } from '@/lib/api';
import { storage } from '@/lib/storage';
import { SocketEvents } from '@/constants/socket';
import { emitPlay } from '@/socket/emitters';
import type { Room } from '@/types/room';
import type { Song } from '@/types/song';
import type { User } from '@/types/user';
import type { Socket } from 'socket.io-client';

const showQueueToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (typeof document === 'undefined') return;

  let container = document.getElementById('queue-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'queue-toast-container';
    container.style.position = 'fixed';
    container.style.right = '24px';
    container.style.bottom = '24px';
    container.style.zIndex = '9999';
    container.style.display = 'grid';
    container.style.gap = '12px';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.setAttribute('role', 'status');
  toast.style.pointerEvents = 'auto';
  toast.style.minWidth = '280px';
  toast.style.maxWidth = '360px';
  toast.style.padding = '14px 16px';
  toast.style.borderRadius = '16px';
  toast.style.color = type === 'success' ? '#eafff8' : '#fff1f2';
  toast.style.background = type === 'success'
    ? 'linear-gradient(135deg, rgba(22, 101, 83, 0.96), rgba(18, 42, 38, 0.96))'
    : 'linear-gradient(135deg, rgba(127, 29, 29, 0.96), rgba(50, 18, 22, 0.96))';
  toast.style.border = type === 'success' ? '1px solid rgba(103, 200, 171, 0.45)' : '1px solid rgba(248, 113, 113, 0.45)';
  toast.style.boxShadow = '0 18px 42px rgba(0, 0, 0, 0.28)';
  toast.style.backdropFilter = 'blur(14px)';
  toast.style.transform = 'translateY(10px)';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 180ms ease, transform 180ms ease';
  toast.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <span style="width:28px;height:28px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.14);font-weight:800;flex:0 0 auto;">
        ${type === 'success' ? '✓' : '!'}
      </span>
      <div style="min-width:0;">
        <strong style="display:block;font-size:13px;margin-bottom:3px;">${type === 'success' ? 'Đã thêm vào hàng chờ' : 'Không thể thêm bài hát'}</strong>
        <span style="display:block;font-size:12px;line-height:1.45;opacity:.86;">${message}</span>
      </div>
    </div>
  `;

  container.appendChild(toast);
  window.requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    window.setTimeout(() => toast.remove(), 220);
  }, 3200);
};

export type RoomQueueConfig = {
  roomId: string;
  currentRoom: Room | null;
  playMode: 'live' | 'free';
  canControl: boolean;
  user: User | null;
  socket: Socket | null;
  fetchRoom: (roomId: string) => Promise<void>;
  setCurrentSong: (song: Song | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  currentSong: Song | null;
  isPlaying: boolean;
  repeatMode: 'off' | 'all' | 'one';
};

export const useRoomQueue = ({
  roomId,
  currentRoom,
  playMode,
  canControl,
  user,
  socket,
  fetchRoom,
  setCurrentSong,
  setIsPlaying,
  setCurrentTime,
  currentSong,
  isPlaying,
  repeatMode,
}: RoomQueueConfig) => {
  const [personalQueue, setPersonalQueue] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [officialOnly, setOfficialOnly] = useState(false);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searchPageToken, setSearchPageToken] = useState<string | null>(null);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMoreSearchResults, setIsLoadingMoreSearchResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?._id) return;
    setPersonalQueue(storage.get(`pq_${user._id}`, []));
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) return;
    storage.set(`pq_${user._id}`, personalQueue);
  }, [personalQueue, user?._id]);

  useEffect(() => {
    if (!user?._id) return;
    setFavorites(new Set(storage.get<string[]>(`fav_${user._id}`, [])));
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) return;
    storage.set(`fav_${user._id}`, Array.from(favorites));
  }, [favorites, user?._id]);

  const activeQueue = useMemo(() => (playMode === 'live' ? currentRoom?.queue || [] : personalQueue), [currentRoom?.queue, personalQueue, playMode]);

  const fetchSearchSongs = useCallback(async ({ pageToken = null, reset = true }: { pageToken?: string | null; reset?: boolean } = {}) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchPageToken(null);
      setHasMoreSearchResults(false);
      setSearchError(null);
      return;
    }

    if (pageToken) {
      setIsLoadingMoreSearchResults(true);
    } else {
      setIsSearching(true);
    }

    try {
      const response = await songAPI.searchSongs({
        query: searchQuery,
        source: 'youtube',
        limit: 20,
        pageToken: pageToken || undefined,
        officialOnly,
      });

      const songs = response.data.data.songs || [];
      const nextPageToken = response.data.data.pagination?.nextPageToken || null;

      setSearchResults((prev) => (reset ? songs : [...prev, ...songs]));
      setSearchPageToken(nextPageToken);
      setHasMoreSearchResults(Boolean(nextPageToken));
      setSearchError(null);
    } catch (error: any) {
      setSearchError(error.response?.data?.message || error.message || 'Không thể tìm kiếm bài hát');
      if (reset) {
        setSearchResults([]);
        setSearchPageToken(null);
        setHasMoreSearchResults(false);
      }
    } finally {
      setIsSearching(false);
      setIsLoadingMoreSearchResults(false);
    }
  }, [searchQuery, officialOnly]);

  const handleSearchSongs = useCallback(() => {
    fetchSearchSongs({ reset: true });
  }, [fetchSearchSongs]);

  const loadMoreSearchSongs = useCallback(() => {
    if (!hasMoreSearchResults || isSearching || isLoadingMoreSearchResults || !searchPageToken) return;
    fetchSearchSongs({ pageToken: searchPageToken, reset: false });
  }, [fetchSearchSongs, hasMoreSearchResults, isSearching, isLoadingMoreSearchResults, searchPageToken]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      if (!searchQuery.trim()) return;
      fetchSearchSongs({ reset: true });
    }, 350);

    return () => window.clearTimeout(handler);
  }, [fetchSearchSongs, searchQuery]);

  const handleAddToQueue = useCallback(async (song: Song) => {
    try {
      // Ẩn kết quả ngay lập tức sau khi bấm thêm
      setSearchQuery('');
      setSearchResults([]);
      setSearchPageToken(null);
      setHasMoreSearchResults(false);
      setSearchError(null);

      if (playMode === 'free') {
        setPersonalQueue((queue) => [...queue, song]);
        showQueueToast(`"${song.title || 'bài hát'}" đã được thêm vào hàng chờ.`);
        return;
      }

      let songId = song._id;
      if (!songId && song.source === 'youtube') {
        const response = await songAPI.addSong(song);
        songId = response.data.data.song._id;
      }

      const roomDbId = currentRoom?._id || roomId;
      if (!songId || !roomDbId) {
        showQueueToast('Thiếu ID phòng hoặc bài hát. Vui lòng thử lại.', 'error');
        return;
      }

      await songAPI.addToQueue(roomDbId, songId);
      await fetchRoom(roomId);
      socket?.emit(SocketEvents.SEND_MESSAGE, { content: `${user?.username} đã thêm: ${song.title}`, type: 'system' });
      showQueueToast(`"${song.title || 'bài hát'}" đã được thêm vào hàng chờ.`);
    } catch (error: any) {
      showQueueToast(error.response?.data?.message || error.message || 'Không thể thêm bài hát', 'error');
    }
  }, [currentRoom?._id, fetchRoom, playMode, roomId, socket, user]);

  const handleRemoveFromQueue = useCallback(async (songId: string, title?: string) => {
    if (playMode === 'free') {
      setPersonalQueue((queue) => queue.filter((song) => (song._id || song.sourceId) !== songId));
      return;
    }
    if (!canControl) {
      alert('Chỉ host/moderator mới có thể xóa');
      return;
    }
    try {
      const roomDbId = currentRoom?._id || roomId;
      if (!roomDbId) {
        alert('Không thể xóa do thiếu ID phòng. Vui lòng thử lại sau.');
        return;
      }
      await songAPI.removeFromQueue(roomDbId, songId);
      await fetchRoom(roomId);
      socket?.emit(SocketEvents.SEND_MESSAGE, { content: `${user?.username} đã xóa: ${title || 'bài hát'}`, type: 'system' });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể xóa');
    }
  }, [canControl, currentRoom?._id, fetchRoom, playMode, roomId, socket, user]);

  const handlePlaySong = useCallback(
    (song: Song, index?: number) => {
      const selectedSongKey = song._id || song.sourceId;
      const currentSongKey = currentSong?._id || currentSong?.sourceId;

      if (!selectedSongKey) return;

      if (currentSongKey && selectedSongKey === currentSongKey) {
        if (!isPlaying) {
          if (playMode === 'live') {
            if (canControl) {
              emitPlay(socket as any, roomId, 0);
            }
          } else {
            setIsPlaying(true);
          }
        }
        return;
      }

      if (playMode === 'free') {
        setCurrentSong(song);
        setCurrentTime(0);
        setIsPlaying(true);

        if (typeof index === 'number') {
          setPersonalQueue((queue) => queue.filter((_, i) => i !== index));
        }

        return;
      }

      if (!canControl) {
        setCurrentSong(song);
        setCurrentTime(0);
        setIsPlaying(true);
        return;
      }

      const songId = song._id || song.sourceId;
      if (!songId) return;

      socket?.emit(SocketEvents.PLAY_SONG, { songId });
    },
    [
      canControl,
      currentSong?._id,
      currentSong?.sourceId,
      isPlaying,
      playMode,
      roomId,
      setCurrentSong,
      setCurrentTime,
      setIsPlaying,
      socket,
    ]
  );

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearPersonalQueue = useCallback(() => {
    setPersonalQueue([]);
  }, []);

  return {
    activeQueue,
    personalQueue,
    setPersonalQueue,
    searchQuery,
    setSearchQuery,
    officialOnly,
    setOfficialOnly,
    searchResults,
    isSearching,
    isLoadingMoreSearchResults,
    hasMoreSearchResults,
    searchError,
    favorites,
    handleSearchSongs,
    loadMoreSearchSongs,
    handleAddToQueue,
    handleRemoveFromQueue,
    handlePlaySong,
    toggleFavorite,
    clearPersonalQueue,
  };
};
