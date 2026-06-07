'use client';

import { X, Radio } from 'lucide-react';
import type { Room } from '@/types/room';

interface CreateRoomModalProps {
  visible: boolean;
  createForm: {
    name: string;
    description: string;
    isPrivate: boolean;
    tags: string;
  };
  onChange: (field: string, value: string | boolean) => void;
  onClose: () => void;
  onSubmit: () => void;
  error: string;
  isLoading: boolean;
}

export default function CreateRoomModal({
  visible,
  createForm,
  onChange,
  onClose,
  onSubmit,
  error,
  isLoading,
}: CreateRoomModalProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="glass-strong w-full max-w-[640px] rounded-3xl border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Tạo phòng</p>
            <h2 className="mt-2 text-2xl font-black">Live mới</h2>
          </div>
          <button onClick={onClose} className="ctrl-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <input
            className="input-field"
            placeholder="Tên phòng"
            value={createForm.name}
            onChange={(e) => onChange('name', e.target.value)}
          />

          <textarea
            rows={3}
            className="input-field resize-none"
            placeholder="Mô tả"
            value={createForm.description}
            onChange={(e) => onChange('description', e.target.value)}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={createForm.isPrivate}
                onChange={(e) => onChange('isPrivate', e.target.checked)}
                className="accent-[rgb(var(--ac1))] h-4 w-4 rounded"
              />
              Phòng riêng tư
            </label>
            <input
              className="input-field max-w-[260px]"
              placeholder="Thể loại, ví dụ: Chill"
              value={createForm.tags}
              onChange={(e) => onChange('tags', e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
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
            <Radio className="h-4 w-4" />
            {isLoading ? 'Đang tạo...' : 'Tạo phòng'}
          </button>
        </div>
      </div>
    </div>
  );
}
