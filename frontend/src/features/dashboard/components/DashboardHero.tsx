'use client';

import { Music2, Repeat, Share2, Users } from 'lucide-react';
import type { Room } from '@/types/room';

interface DashboardHeroProps {
  room: Room | null;
  onJoin: () => void;
  onCreate: () => void;
  onShare: () => void;
}

const defaultCover =
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80';

const toLabel = (room: Room | null) => {
  if (!room) return 'Music Social Hub';
  if (room.isActive) return 'LIVE NOW';
  return 'UP NEXT';
};

export default function DashboardHero({ room, onJoin, onCreate, onShare }: DashboardHeroProps) {
  const cover = room?.playback?.currentSong?.coverArt || defaultCover;
  const title = room?.name || 'SyncMusic Lounge';
  const subtitle = room?.playback?.currentSong?.title
    ? `Đang phát: ${room.playback.currentSong.title}`
    : 'Chưa có nhạc đang phát';
  const hostLabel = room ? `Host: ${room.host.username}` : 'Tạo phòng và phát nhạc ngay';
  const listeners = room?.participants?.length || 0;
  const roomCode = room?.inviteCode ? room.inviteCode.toUpperCase() : null;

  return (
    <section
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[rgb(var(--surf-2))]/60 shadow-2xl shadow-black/20"
      style={{
        backgroundImage: `radial-gradient(circle at top left, rgba(147,51,234,0.24), transparent 24%), radial-gradient(circle at top right, rgba(236,72,153,0.18), transparent 28%), url('${cover}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
        <div className="space-y-5 text-white">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-white/80">
            <Repeat className="h-3.5 w-3.5 text-[rgb(var(--ac1))]" />
            {toLabel(room)}
          </span>

          <div className="space-y-4">
            <div className="text-sm uppercase tracking-[0.26em] text-white/60">Music Social Hub</div>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">{title}</h1>
            <p className="max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
              {subtitle}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Host</p>
              <p className="mt-2 text-lg font-semibold">{hostLabel}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Nghe ngay</p>
              <p className="mt-2 text-lg font-semibold">{listeners} người đang nghe</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={onJoin}
              className="btn-gradient btn-shine min-w-[160px] justify-center"
              disabled={!room}
            >
              <Music2 className="h-4 w-4" />
              Vào nghe ngay
            </button>
            <button
              onClick={onCreate}
              className="pill-btn min-w-[160px] justify-center rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Tạo phòng mới
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
            {roomCode && (
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <span className="font-semibold text-white">Mã phòng:</span>
                <span className="tracking-[0.25em]">{roomCode}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              <Share2 className="h-4 w-4" />
              Chia sẻ phòng
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 p-5 shadow-inner shadow-black/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),transparent_45%)] opacity-60" />
          <div className="relative flex h-full flex-col justify-between gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="rounded-[1.5rem] bg-white/10 p-4 text-sm text-white/70">Now Playing</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.3em] text-white/80">
                {room?.isActive ? 'Live' : 'Offline'}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                  <img src={cover} alt="cover" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-sm uppercase tracking-[0.3em] text-white/50">Hiện tại</p>
                  <p className="mt-1 line-clamp-2 text-lg font-semibold">{room?.playback?.currentSong?.title || 'Không có bản nhạc'}</p>
                  <p className="mt-2 text-sm text-white/60">{room?.playback?.currentSong?.artist || 'SyncMusic Live'}</p>
                </div>
              </div>

              <div className="grid gap-2 rounded-[1.5rem] bg-white/5 p-4 text-sm text-white/80">
                <div className="flex items-center justify-between text-[13px] uppercase tracking-[0.28em] text-white/50">
                  <span>Trạng thái</span>
                  <span>{room?.isActive ? 'Đang phát' : 'Sẵn sàng'}</span>
                </div>
                <div className="flex items-center justify-between text-[13px] uppercase tracking-[0.28em] text-white/50">
                  <span>Thính giả</span>
                  <span>{listeners}</span>
                </div>
                <div className="flex items-center justify-between text-[13px] uppercase tracking-[0.28em] text-white/50">
                  <span>Thể loại</span>
                  <span>{room?.tags?.[0] || 'Live'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[1.8rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Visualizer</p>
              <div className="mt-3 flex items-end gap-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span
                    key={index}
                    className="visualizer-bar"
                    style={{ animationDelay: `${index * 120}ms` }}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-white/75">
              <p className="uppercase tracking-[0.3em] text-white/50">Lời nhắc</p>
              <p className="mt-2 leading-6 text-white/85">
                Đây là không gian nghe nhạc live chung. Thử tham gia phòng đang hot hoặc tạo room của bạn.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
