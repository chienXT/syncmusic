'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import styles from '../auth-shared.module.css';

export default function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToken, fetchUser } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error || !token) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    setToken(token);
    fetchUser()
      .then(() => router.replace('/home'))
      .catch(() => router.replace('/login?error=oauth_failed'));
  }, [searchParams, setToken, fetchUser, router]);

  return (
    <div id="auth-callback-content" className={`flex min-h-screen items-center justify-center ${styles.pageBg}`}>
      <div className="text-center" role="status" aria-live="polite">
        <div className={`mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-t-transparent ${styles.loadingRing}`} />
        <p className={styles.loadingText}>Đang đăng nhập...</p>
      </div>
    </div>
  );
}
