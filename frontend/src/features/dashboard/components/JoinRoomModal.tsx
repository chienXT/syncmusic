'use client';

import { X, Hash } from 'lucide-react';

interface JoinRoomModalProps {
  visible: boolean;
  inviteCode: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  error: string;
  isLoading: boolean;
}

export default function JoinRoomModal({
  visible,
  inviteCode,
  onChange,
  onClose,
  onSubmit,
  error,
  isLoading,
}: JoinRoomModalProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="glass-strong w-full max-w-[460px] rounded-3xl border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Join room</p>
            <h2 className="mt-2 text-2xl font-black">Nhập mã</h2>
          </div>
          <button onClick={onClose} className="ctrl-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <input
            className="input-field text-center font-mono text-xl uppercase tracking-[0.25em]"
            placeholder="XXXXXX"
            value={inviteCode}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
          />

          {error && <p className="text-center text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 p-6 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="pill-btn rounded-[1.5rem] px-5 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
          >
            Hủy
          </button>
          <button
            onClick={onSubmit}
            disabled={isLoading}
            className="btn-gradient rounded-[1.5rem] px-6 py-3 text-sm"
          >
            <Hash className="h-4 w-4" />
            {isLoading ? 'Đang vào...' : 'Tham gia'}
          </button>
        </div>
      </div>
    </div>
  );
}
