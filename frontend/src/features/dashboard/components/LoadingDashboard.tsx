'use client';

export default function LoadingDashboard() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-[rgb(var(--surf-2))]/60 p-6 shadow-xl shadow-black/10">
        <div className="h-6 w-48 rounded-full bg-white/10 skeleton" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="h-44 rounded-[1.8rem] bg-white/10 skeleton" />
          <div className="h-44 rounded-[1.8rem] bg-white/10 skeleton" />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.95fr]">
        <div className="space-y-4 rounded-[2rem] border border-white/10 bg-[rgb(var(--surf-2))]/60 p-6 shadow-xl shadow-black/10">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-8 rounded-full bg-white/10 skeleton" />
            <div className="h-8 rounded-full bg-white/10 skeleton" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-44 rounded-[1.8rem] bg-white/10 skeleton" />
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-[2rem] border border-white/10 bg-[rgb(var(--surf-2))]/60 p-6 shadow-xl shadow-black/10">
          <div className="h-8 rounded-full bg-white/10 skeleton" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 rounded-[1.5rem] bg-white/10 skeleton" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
