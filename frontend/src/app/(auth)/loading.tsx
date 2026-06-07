export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--base))] text-white">
      <div className="rounded-3xl bg-[rgb(var(--surf-1))]/90 px-8 py-10 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/10 border-t-[rgb(var(--ac1))]" />
      </div>
    </div>
  );
}
