"use client";

import { AnimatePresence } from 'framer-motion';
import { ListMusic } from 'lucide-react';
import type { Song } from '@/types/song';
import type { Panel } from '@/types/player';
import QueueItem from './QueueItem';

type QueuePanelProps = {
  activePanel: Panel;
  activeQueue: Song[];
  currentSong: Song | null;
  playMode: 'live' | 'free';
  personalQueue: Song[];
  canControlPlay: boolean;
  onPlaySong: (song: Song) => void;
  onRemoveFromQueue: (songId: string, title?: string) => void;
  onClearPersonalQueue: () => void;
};

const QueuePanel = ({
  activePanel,
  activeQueue,
  currentSong,
  playMode,
  personalQueue,
  canControlPlay,
  onPlaySong,
  onRemoveFromQueue,
  onClearPersonalQueue,
}: QueuePanelProps) => {
  if (activePanel !== 'queue') return null;

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-1 scrollbar-none">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'rgb(var(--t3))' }}>{activeQueue.length} bài chờ</p>
        {playMode === 'free' && personalQueue.length > 0 && (
          <button className="text-[11px] font-semibold transition-colors" style={{ color: 'rgba(var(--err),0.7)' }} onClick={onClearPersonalQueue}>Xóa tất cả</button>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {activeQueue.map((song, index) => (
          <QueueItem
            key={`${song._id || song.sourceId}-${index}`}
            song={song}
            index={index}
            isCurrent={(song._id || song.sourceId) === (currentSong?._id || currentSong?.sourceId)}
            canControlPlay={canControlPlay}
            onPlay={onPlaySong}
            onRemove={onRemoveFromQueue}
          />
        ))}
      </AnimatePresence>

      {activeQueue.length === 0 && (
        <div className="text-center py-12">
          <ListMusic size={32} className="mx-auto mb-2" style={{ color: 'rgb(var(--t3))' }} />
          <p className="text-sm" style={{ color: 'rgb(var(--t2))' }}>Hàng đợi trống</p>
          <p className="text-[11px] mt-1" style={{ color: 'rgb(var(--t3))' }}>Tìm và thêm bài hát</p>
        </div>
      )}
    </div>
  );
};

export default QueuePanel;