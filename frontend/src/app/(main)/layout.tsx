import type { ReactNode } from 'react';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import SessionGuard from '@/components/auth/SessionGuard';
import MobileHeader from '@/components/layout/MobileHeader';
import '@/app/layout-shell.css';
import '@/app/route-pages.css';
import '@/app/mobile.css';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <SessionGuard />
      <Sidebar />
      <div className="app-main">
        <Header />
        <MobileHeader />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
