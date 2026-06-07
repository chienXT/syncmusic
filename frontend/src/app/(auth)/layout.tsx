import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Đăng nhập / đăng ký',
  description:
    'Đăng nhập hoặc tạo tài khoản để bắt đầu trải nghiệm nghe nhạc cùng bạn bè trên SyncMusic Live.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[rgb(var(--base))] text-white">
      <main className="flex min-h-screen min-h-[100dvh] w-full flex-col px-0 py-0">
        {children}
      </main>
    </div>
  );
}
