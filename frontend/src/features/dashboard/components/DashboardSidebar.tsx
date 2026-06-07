'use client';

import { Headphones, Hash, Sparkles } from 'lucide-react';
import type { Room } from '@/types/room';

interface DashboardSidebarProps {
  myRoom: Room | null;
  trendingRooms: Room[];
  onJoinRoom: (room: Room) => void;
  onOpenJoinModal: () => void;
}

export default function DashboardSidebar({ myRoom, trendingRooms, onJoinRoom, onOpenJoinModal }: DashboardSidebarProps) {
  return (
    <aside className="space-y-5">
      <div className="rounded-[2rem] border border-white/10 bg-[rgb(var(--surf-2))]/70 p-5 backdrop-blur-xl shadow-xl shadow-black/20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Your Room</p>
            <h3 className="mt-2 text-xl font-black">Phòng của tôi</h3>
          </div>
          <span className="badge badge-success bg-[rgba(var(--ok),0.18)] border-[rgba(var(--ok),0.35)] text-white">{myRoom?.isActive ? 'Live' : 'Offline'}</span>
        </div>

        <div className="mt-5 space-y-3 rounded-[1.8rem] border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          <p className="font-semibold text-white">{myRoom?.name || 'Chưa có phòng'}</p>
          <p>{myRoom?.description || 'Tạo phòng để phát nhạc chung với bạn bè.'}</p>

          {myRoom ? (
            <button
              onClick={() => onJoinRoom(myRoom)}
              className="btn-gradient w-full justify-center rounded-[1.5rem] px-4 py-3 text-sm"
            >
              Vào phòng của tôi
            </button>
          ) : (
            <button
              onClick={onOpenJoinModal}
              className="pill-btn w-full justify-center rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
            >
              Tạo hoặc nhập mã
            </button>
          )}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-[rgb(var(--surf-2))]/70 p-5 backdrop-blur-xl shadow-xl shadow-black/20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Now Trending</p>
            <h3 className="mt-2 text-xl font-black">Top phòng</h3>
          </div>
          <Sparkles className="h-5 w-5 text-[rgb(var(--ac1))]" />
        </div>

        <div className="mt-5 space-y-3">
          {trendingRooms.map((room) => (
            <button
              key={room._id}
              onClick={() => onJoinRoom(room)}
              className="group flex w-full items-start justify-between rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-left transition hover:border-white/20 hover:bg-white/10"
            >
              <div>
                <p className="text-sm font-semibold text-white">{room.name}</p>
                <p className="mt-1 text-xs text-white/50">{room.host.username}</p>
              </div>
              <span className="rounded-full bg-[rgba(var(--ac1),0.12)] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/80">{room.participants?.length || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-[rgb(var(--surf-2))]/70 p-5 backdrop-blur-xl shadow-xl shadow-black/20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Quick Join</p>
            <h3 className="mt-2 text-xl font-black">Nhập mã phòng</h3>
          </div>
          <Hash className="h-5 w-5 text-[rgb(var(--ac2))]" />
        </div>

        <div className="mt-5 space-y-3">
          <p className="text-sm text-white/70">Bạn có thể nhập mã để vào phòng riêng hoặc tìm phòng nhanh.</p>
          <button
            onClick={onOpenJoinModal}
            className="btn-gradient w-full justify-center rounded-[1.5rem] px-4 py-3 text-sm"
          >
            Mở nhập mã
          </button>
        </div>
      </div>
    </aside>
  );
}
