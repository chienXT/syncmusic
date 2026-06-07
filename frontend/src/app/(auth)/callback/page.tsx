'use client';

import { Suspense } from 'react';
import AuthCallbackContent from './content';
import styles from '../auth-shared.module.css';

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div id="auth-callback-fallback" className={`flex min-h-screen items-center justify-center ${styles.pageBg}`}>
          <div className="text-center" role="status" aria-live="polite">
            <div className={`mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-t-transparent ${styles.loadingRing}`} />
            <p className={styles.loadingText}>Đang xác thực tài khoản của bạn...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
