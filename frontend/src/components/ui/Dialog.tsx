'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Dialog({ isOpen, onClose, title, children, className }: DialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={clsx('w-full max-w-2xl overflow-hidden rounded-3xl bg-[rgb(var(--surf-1))] border border-white/10 shadow-2xl shadow-black/40', className)}>
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white">Đóng</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
