'use client';

import clsx from 'clsx';

interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function Tabs({ items, activeId, onChange, className }: TabsProps) {
  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={clsx(
            'rounded-full px-4 py-2 text-sm font-semibold transition',
            item.id === activeId ? 'bg-[rgb(var(--ac1))] text-white' : 'bg-white/5 text-white/80 hover:bg-white/10'
          )}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
