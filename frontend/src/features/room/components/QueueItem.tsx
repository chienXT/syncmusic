"use client";

import { motion } from 'framer-motion';
import { Play, X, Music2 } from 'lucide-react';
import type { Song } from '@/types/song';
import { getSongTitle, getSongMeta } from '@/lib/songHelpers';

type QueueItemProps = {
  song: Song;
  index: number;
  isCurrent: boolean;
  canControlPlay: boolean;
  onPlay: (song: Song) => void;
  onRemove?: (songId: string, title?: string) => void;
};

const QueueItem = ({ song, index, isCurrent, canControlPlay, onPlay, onRemove }: QueueItemProps) => {
  const label = isCurrent ? (
    <span className="playing-bars"><span className="playing-bar"/><span className="playing-bar"/><span className="playing-bar"/></span>
  ) : (
    <span className="text-[11px] font-bold" style={{ color: 'rgb(var(--t3))' }}>{index + 1}</span>
  );

  return (
    <motion.div layout className={`song-row group ${isCurrent ? 'is-current' : ''}`}
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10, height: 0 }} transition={{ duration: 0.18, delay: index * 0.02 }}>
      <span className="w-5 flex items-center justify-center flex-shrink-0">{label}</span>
      <div className="song-thumb">
        {song.coverArt ? <img src={song.coverArt} alt={getSongTitle(song)} className="w-full h-full object-cover" /> : <Music2 size={14} style={{ color: 'rgb(var(--t3))' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white truncate">{getSongTitle(song)}</p>
        <p className="text-[11px] truncate" style={{ color: 'rgb(var(--t2))' }}>{getSongMeta(song)}</p>
      </div>
      <button
        type="button"
        onClick={() => onPlay(song)}
        className="ctrl-btn !w-7 !h-7 shrink-0"
        title="Phát bài này"
      >
        <Play size={12} style={{ color: 'rgb(var(--ac1))' }} />
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(song._id || song.sourceId || '', song.title)}
          disabled={!canControlPlay || isCurrent}
          className="ctrl-btn !w-7 !h-7 shrink-0 hover:bg-[rgba(var(--err),0.15)]"
          title={isCurrent ? 'Không thể xóa bài đang phát' : canControlPlay ? 'Xóa khỏi danh sách' : 'Chỉ host/mod mới xóa được'}
        >
          <X size={12} style={{ color: 'rgba(var(--err),0.7)' }} />
        </button>
      )}
    </motion.div>
  );
};

export default QueueItem;
