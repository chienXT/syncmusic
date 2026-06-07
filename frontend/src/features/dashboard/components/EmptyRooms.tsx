'use client';

import { Music2, Plus, Hash } from 'lucide-react';

interface EmptyRoomsProps {
  onCreate: () => void;
  onOpenJoinModal: () => void;
}

export default function EmptyRooms({ onCreate, onOpenJoinModal }: EmptyRoomsProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-[rgb(var(--surf-2))]/70 p-10 text-center text-white/80">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-white/90 shadow-lg shadow-black/20">
        <Music2 className="h-10 w-10" />
      </div>
      <h3 className="mt-6 text-2xl font-black">Chưa có phòng nào đang phát</h3>
      <p className="mt-3 max-w-md text-sm text-white/60">
        Hãy tạo phòng đầu tiên hoặc nhập mã để tham gia phòng riêng tư của bạn bè.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button onClick={onCreate} className="btn-gradient rounded-[1.5rem] px-6 py-3 text-sm font-semibold">
          <Plus className="h-4 w-4" />
          Tạo phòng đầu tiên
        </button>
        <button onClick={onOpenJoinModal} className="pill-btn rounded-[1.5rem] border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 hover:bg-white/10">
          <Hash className="h-4 w-4" />
          Nhập mã phòng
        </button>
      </div>
    </div>
  );
}
