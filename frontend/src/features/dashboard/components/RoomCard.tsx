'use client';

import { Headphones, Play, Sparkles } from 'lucide-react';
import type { Room } from '@/types/room';

interface RoomCardProps {
  room: Room;
  onJoin: (room: Room) => void;
}

const listenerLabel = (count: number) => `${count} thính giả`;

const getPrimaryTag = (room: Room) => {
  return (room.tags || ['Live'])[0];
};

export default function RoomCard({ room, onJoin }: RoomCardProps) {
  const listeners = room.participants?.length || 0;
  const songTitle = room.playback?.currentSong?.title || 'Chưa có bài hát';

  return (
    <div className="group relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-[rgb(var(--surf-1))]/40 shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-white/15">
      <div className="relative overflow-hidden">
        <img
          src={room.playback?.currentSong?.coverArt || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=80'}
          alt={room.name}
          className="h-[220px] w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="badge badge-danger bg-[rgba(var(--err),0.18)] border-[rgba(var(--err),0.35)] text-white">LIVE</span>
          <span className="badge badge-info bg-[rgba(var(--ac2),0.16)] border-[rgba(var(--ac2),0.35)] text-white">{listenerLabel(listeners)}</span>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 opacity-0 transition duration-300 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onJoin(room)}
            className="btn-gradient btn-shine w-full justify-center rounded-[1.5rem] px-4 py-3 text-sm"
          >
            <Play className="h-4 w-4" />
            Vào nghe
          </button>
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.25em] text-white/50">
          <span>{getPrimaryTag(room)}</span>
          <span className="inline-flex items-center gap-1 text-white/60">
            <Headphones className="h-3.5 w-3.5" /> {listeners}
          </span>
        </div>

        <h3 className="line-clamp-2 text-xl font-semibold text-white">{room.name}</h3>

        <p className="line-clamp-2 text-sm text-white/60">Host: {room.host.username}</p>

        <p className="text-sm text-white/65">{songTitle}</p>

        <div className="flex flex-wrap gap-2 pt-3">
          {(room.tags || []).slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/70"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-white/50">
          <Sparkles className="h-3.5 w-3.5 text-[rgb(var(--ac1))]" />
          <span>Live stage</span>
        </div>
      </div>
    </div>
  );
}
