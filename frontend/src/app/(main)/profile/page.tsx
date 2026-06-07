'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user?._id) {
      router.replace(`/profile/${user._id}`);
    }
  }, [router, user?._id]);

  if (!user?._id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg-primary))] music-pattern text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 shadow-2xl backdrop-blur-xl">
          Đang tải hồ sơ...
        </div>
      </div>
    );
  }

  return null;
}