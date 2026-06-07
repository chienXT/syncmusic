'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import clsx from 'clsx';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Dropdown({ trigger, children, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={clsx('relative inline-block text-left', className)}>
      <button type="button" onClick={() => setOpen((value) => !value)}>{trigger}</button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[rgb(var(--surf-1))] shadow-xl shadow-black/40">
          {children}
        </div>
      ) : null}
    </div>
  );
}
