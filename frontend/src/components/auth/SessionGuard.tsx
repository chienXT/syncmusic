'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { getSocket } from '@/socket';
import { clearAuth } from '@/lib/auth';

export default function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const bootstrappedAtRef = useRef(Date.now());

  useEffect(() => {
    const socket = getSocket();

    const handleForceLogout = (data?: { message?: string }) => {
      const isBootstrapWindow = Date.now() - bootstrappedAtRef.current < 5000;
      if (isBootstrapWindow) {
        console.warn('[session] ignored transient force logout during reload', data?.message || 'another session');
        return;
      }

      console.warn('[session] force logout', data?.message || 'another session');
      socket.io.opts.reconnection = false;
      socket.disconnect();
      clearAuth();
      router.replace('/login?reason=another_session');
    };

    socket.off('force_logout' as any, handleForceLogout as any);
    socket.on('force_logout' as any, handleForceLogout as any);

    return () => {
      socket.off('force_logout' as any, handleForceLogout as any);
    };
  }, [router, pathname]);

  return null;
}
