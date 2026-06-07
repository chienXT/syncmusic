'use client';

interface RoomFiltersProps {
  filters: string[];
  selected: string;
  onSelect: (filter: string) => void;
}

export default function RoomFilters({ filters, selected, onSelect }: RoomFiltersProps) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="inline-flex gap-2">
        {filters.map((filter) => {
          const isActive = filter === selected;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onSelect(filter)}
              className={`inline-flex items-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${isActive ? 'border-[rgba(var(--ac1),0.55)] bg-[rgba(var(--ac1),0.14)] text-white' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              {filter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
