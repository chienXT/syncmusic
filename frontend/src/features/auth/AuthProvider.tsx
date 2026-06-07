'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { fetchUser } = useAuthStore();

  useEffect(() => {
    // Initialize auth state on app load
    console.log('🔐 AuthProvider: Initializing authentication...');
    fetchUser().then(() => {
      console.log('🔐 AuthProvider: fetchUser completed');
    }).catch((error) => {
      console.error('🔐 AuthProvider: fetchUser failed:', error);
    });
  }, [fetchUser]);

  return <>{children}</>;
}