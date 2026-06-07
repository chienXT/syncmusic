'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Disc, Heart, ListPlus, Pause, Play, Radio, Repeat, RefreshCw, Share2, SkipBack, SkipForward, Volume1, Volume2, VolumeX, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Song } from '@/types/song';
import { createVizBars } from '@/lib/visualizer';
import { getSongTitle } from '@/lib/songHelpers';
import { useToastStore } from '@/store/toastStore';
import { playlistAPI, songAPI } from '@/shared/lib/api';

type PlayerSectionProps = {
  currentSong: Song | null;
  isPlaying: boolean;
  needsInteraction: boolean;
  playMode: 'live' | 'free';
  syncStatus: 'synced' | 'syncing' | 'error';
  isConnected: boolean;
  progressPct: number;
  currentTime: number;
  volume: number;
  activeQueueLength: number;
  canControlPlay: boolean;
  shuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  onEnableAudio: () => void;
  handlePlayPause: () => void;
  handleSeek: (time: number) => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  setShuffle: (value: boolean) => void;
  setRepeatMode: (value: 'off' | 'all' | 'one') => void;
  setVolume: (value: number) => void;
  onSwitchToLive: () => void;
  onSwitchToFree: () => void;
};

const PlayerSection = ({
  currentSong,
  isPlaying,
  needsInteraction,
  playMode,
  syncStatus,
  isConnected,
  progressPct,
  currentTime,
  volume,
  activeQueueLength,
  canControlPlay,
  shuffle,
  repeatMode,
  onEnableAudio,
  handlePlayPause,
  handleSeek,
  onSkipBack,
  onSkipForward,
  setShuffle,
  setRepeatMode,
  setVolume,
  onSwitchToLive,
  onSwitchToFree,
}: PlayerSectionProps) => {
  const vizBars = createVizBars();
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Array<{ _id: string; name: string; color?: string }>>([]);
  const [playlistBusy, setPlaylistBusy] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  const duration = currentSong?.duration && currentSong.duration > 0 ? currentSong.duration : 0;
  const safeCurrentTime = duration > 0 ? Math.min(Math.max(currentTime, 0), duration) : Math.max(currentTime, 0);
  const safeProgressPct = duration > 0 ? (safeCurrentTime / duration) * 100 : progressPct;
  const canUseControls = playMode === 'free' || canControlPlay;
  const songId = currentSong?._id?.toString?.() || currentSong?.sourceId?.toString?.() || '';

  useEffect(() => {
    let cancelled = false;
    if (!songId) {
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
  }, [songId]);

  const handleToggleLike = async () => {
    if (!songId) return addToast('Chưa có bài hát để thích', 'warning');
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
    <motion.div className="player-shell relative overflow-hidden p-3 sm:p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-16 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(var(--ac1),0.15),transparent_55%)]" />
        <div className="absolute -bottom-20 right-0 h-44 w-72 rounded-full bg-[radial-gradient(circle,rgba(var(--ac2),0.12),transparent_55%)]" />
      </div>
      <div className="relative z-10">
      <AnimatePresence>
        {currentSong?.coverArt && isPlaying && !needsInteraction && (
          <motion.div key="bg" className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 0.1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
            <div style={{ backgroundImage: `url(${currentSong.coverArt})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(80px) saturate(2)', transform: 'scale(1.5)' }} className="absolute inset-0" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex items-center justify-between mb-6" style={{ zIndex: 1 }}>
        <div className="flex items-center gap-2">
          <div className="h-px w-6 bg-white/20" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgb(var(--t2))' }}>
            Đang phát
          </span>
        </div>
        <div className="flex items-center gap-2">
          {syncStatus === 'syncing' && (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <RefreshCw size={12} style={{ color: 'rgb(var(--warn))' }} />
            </motion.div>
          )}
          <div
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold"
            style={{
              background: 'rgba(147,51,234,0.12)',
              border: '1px solid rgba(147,51,234,0.22)',
              color: 'rgb(var(--ac1))',
            }}
          >
            <Radio size={13} />
            {playMode === 'live' ? 'Host đang điều khiển' : 'Chế độ tự do'}
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-6 mb-4 lg:flex-row lg:items-center" style={{ zIndex: 1 }}>
        <div className="relative flex-shrink-0">
          <motion.div className={`album-art-wrap ${isPlaying && !needsInteraction ? 'spinning is-circle' : ''}`} style={{ width: 220, height: 220 }} whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
            <AnimatePresence mode="wait">
              <motion.div key={currentSong?.sourceId || 'empty'} className="w-full h-full" initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.35 }}>
                {currentSong?.coverArt ? (
                  <img src={currentSong.coverArt} alt={getSongTitle(currentSong)} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center gradient-animated"><Disc size={56} className="text-white/25" /></div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={currentSong?._id || currentSong?.sourceId || 'none'} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <h2 className="player-title mb-2 line-clamp-2 !text-3xl sm:!text-4xl">{currentSong?.title || 'Chưa có bài hát'}</h2>
              <p className="player-artist !text-sm sm:!text-base">{currentSong?.artist || 'Unknown Artist'}</p>
            </motion.div>
          </AnimatePresence>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              type="button"
              className={`ctrl-btn ${liked ? 'active' : ''}`}
              onClick={handleToggleLike}
              disabled={likeBusy || !songId}
              aria-label={liked ? 'Bỏ thích bài hát' : 'Thích bài hát'}
            >
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <div className="relative">
              <button
                type="button"
                className={`ctrl-btn ${playlistOpen ? 'active' : ''}`}
                onClick={handleTogglePlaylist}
                disabled={playlistBusy || !songId}
                aria-label="Thêm vào playlist"
              >
                <ListPlus size={16} />
              </button>
              {playlistOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-white/10 bg-[#08080b]/95 p-3 shadow-[0_22px_70px_rgba(0,0,0,.65)] backdrop-blur-xl">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Thêm vào playlist</div>
                  <div className="max-h-56 space-y-2 overflow-auto">
                    {playlistBusy ? (
                      <div className="text-sm text-white/60">Đang tải...</div>
                    ) : playlists.length === 0 ? (
                      <div className="text-sm text-white/60">Bạn chưa có playlist</div>
                    ) : playlists.map((playlist) => (
                      <button
                        key={playlist._id}
                        type="button"
                        onClick={() => handleAddToPlaylist(playlist._id)}
                        className="flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-left text-sm text-white/80 transition hover:border-amber-300/25 hover:bg-amber-300/10 hover:text-white"
                      >
                        <i className="h-2.5 w-2.5 rounded-full" style={{ background: playlist.color || '#f5a623' }} />
                        <span className="truncate">{playlist.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {currentSong?.source === 'youtube' && <span className="badge badge-red">YOUTUBE</span>}
            <span className={`badge ${syncStatus === 'synced' ? 'badge-green' : syncStatus === 'syncing' ? 'badge-purple' : 'badge-red'}`}>
              <span className={`sync-dot ${syncStatus}`} />{syncStatus === 'synced' ? 'Đồng bộ' : syncStatus === 'syncing' ? 'Đang sync' : 'Lỗi'}
            </span>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {needsInteraction && (
          <motion.div className="mb-5 p-3.5 glass-subtle rounded-xl border border-[rgba(var(--warn),0.28)]" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ zIndex: 1, position: 'relative' }}>
            <p className="text-sm mb-2.5" style={{ color: 'rgb(var(--warn))' }}>Trình duyệt chặn phát tự động.</p>
            <button className="btn-gradient btn-shine w-full text-sm py-2" onClick={onEnableAudio}>
              🎵 Bật âm thanh
            </button>
          </motion.div>
        )}
      </AnimatePresence>


      <div className="mb-4" style={{ position: 'relative', zIndex: 1 }}>
        <div className="progress-track mb-2">
          <div className="progress-fill" style={{ width: `${Math.min(100, safeProgressPct)}%` }} />
          <input type="range" min="0" max={duration > 0 ? duration : 100}
            value={safeCurrentTime}
            onChange={(event) => handleSeek(Number(event.target.value))}
            disabled={!canUseControls}
            className="absolute inset-0 w-full h-full opacity-0" style={{ cursor: canUseControls ? 'pointer' : 'default' }} />
        </div>
        <div className="flex items-center justify-between mono text-[11px]" style={{ color: 'rgb(var(--t3))' }}>
          <span>{formatTime(safeCurrentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex items-center gap-2.5">
          {playMode === 'free' && (
            <motion.button whileTap={{ scale: 0.9 }} className={`ctrl-btn ${shuffle ? 'active' : ''}`} onClick={() => setShuffle(!shuffle)}>
              <Zap size={16} />
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.9 }} className="ctrl-btn" onClick={onSkipBack} disabled={!canUseControls}>
            <SkipBack size={18} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} className="ctrl-btn-play" onClick={handlePlayPause} disabled={!canUseControls}>
            <AnimatePresence mode="wait">
              {isPlaying ? (
                <motion.div key="pause" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.12 }}><Pause size={24} /></motion.div>
              ) : (
                <motion.div key="play" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.12 }}><Play size={24} className="ml-0.5" /></motion.div>
              )}
            </AnimatePresence>
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} className="ctrl-btn" onClick={onSkipForward} disabled={!canUseControls}>
            <SkipForward size={18} />
          </motion.button>
          {playMode === 'free' && (
            <motion.button whileTap={{ scale: 0.9 }} className={`ctrl-btn relative ${repeatMode !== 'off' ? 'active' : ''}`} onClick={() => setRepeatMode(repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off')}>
              <Repeat size={16} />
              {repeatMode === 'one' && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ background: 'rgb(var(--ac1))' }}>1</motion.span>
              )}
            </motion.button>
          )}
        </div>

        <div className="flex items-center gap-2 max-w-[130px]">
          <motion.button whileTap={{ scale: 0.9 }} className="ctrl-btn !w-8 !h-8" onClick={() => setVolume(volume === 0 ? 70 : 0)}>
            {volume === 0 ? <VolumeX size={15} /> : volume < 50 ? <Volume1 size={15} /> : <Volume2 size={15} />}
          </motion.button>
          <div className="vol-track relative">
            <div className="vol-fill" style={{ width: `${volume}%` }} />
            <input type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
          <span className="mono text-[11px] w-7 text-right" style={{ color: 'rgb(var(--t3))' }}>{volume}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]" style={{ position: 'relative', zIndex: 1 }}>
        <span className={`badge ${canControlPlay && playMode === 'live' ? 'badge-violet' : ''}`} style={!(canControlPlay && playMode === 'live') ? { background: 'rgba(255,255,255,0.04)', color: 'rgb(var(--t2))', border: '1px solid rgba(255,255,255,0.07)' } : {}}>
          {playMode === 'live'
            ? canControlPlay ? <>Host</> : <>Guest</>
            : <>Chế độ tự do</>}
        </span>
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgb(var(--t3))' }}>
          <Disc size={11} />
          <span>{activeQueueLength} bài chờ</span>
        </div>
      </div>
      </div>
    </motion.div>
  );
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default PlayerSection;