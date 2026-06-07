"use client";

import { Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.16),transparent_20%),rgb(15,23,42)] text-white px-4 py-8">
      <div className="max-w-lg w-full rounded-[2rem] bg-[rgba(15,23,42,0.96)] border border-white/10 p-10 text-center shadow-[0_30px_80px_rgba(15,23,42,0.55)] backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/20">
          <Search size={34} />
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">SyncMusic</p>
        <h1 className="text-4xl font-semibold text-white mb-3">Không tìm thấy trang</h1>
        <p className="mx-auto max-w-md text-sm leading-7 text-slate-300 mb-8">
          Trang bạn tìm không tồn tại hoặc đã bị xóa. Hãy kiểm tra lại đường dẫn hoặc quay lại trang chính.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => router.push('/home')} className="min-w-[180px] bg-emerald-500 hover:bg-emerald-400">
            Về trang chính
          </Button>
          <Button onClick={() => router.refresh()} className="min-w-[180px] border border-white/10 bg-white/5 text-white hover:bg-white/10">
            Tải lại trang
          </Button>
        </div>
      </div>
    </div>
  );
}
