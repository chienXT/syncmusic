export default function LoadingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--base))] text-white">
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-[rgb(var(--surf-1))]/80 px-8 py-10 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/10 border-t-white" />
        <p className="text-sm text-white/70">Đang tải nội dung...</p>
      </div>
    </div>
  );
}
