import type { ReactNode } from 'react';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import SessionGuard from '@/components/auth/SessionGuard';
import '@/app/layout-shell.css';
import '@/app/route-pages.css';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <SessionGuard />
      <Sidebar />
      <div className="app-main">
        <Header />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
