'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronDown, LogOut, ShieldCheck } from 'lucide-react';

import { useAuthStore } from '@/store/authStore';
import { useRoomStore } from '@/store/roomStore';

const PAGE_TITLES: [string, string][] = [
  ['/profile', 'Hồ sơ'],
  ['/home', 'Home'],
  ['/explore', 'Khám phá'],
  ['/rooms/create', 'Tạo phòng'],
  ['/playlists', 'Playlist'],
  ['/favorites', 'Yêu thích'],
  ['/history', 'Lịch sử'],
  ['/notifications', 'Thông báo'],
  ['/settings', 'Cài đặt'],
  ['/search', 'Tìm kiếm'],
];

function resolvePageTitle(pathname: string | null, roomName?: string): string {
  if (!pathname) return 'MusicLive';
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/room')) return roomName || 'Phòng nhạc';

  const match = PAGE_TITLES.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : 'MusicLive';
}

export default function Header() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const currentRoom = useRoomStore((s) => s.currentRoom);
  const setMinimized = useRoomStore((s) => s.setRoomMinimized);
  const setKeepAlive = useRoomStore((s) => s.setKeepRoomAlive);

  const isRoomPage = pathname?.startsWith('/room');

  useEffect(() => { setMounted(true); }, []);

  const pageTitle = useMemo(
    () => resolvePageTitle(pathname, currentRoom?.name),
    [pathname, currentRoom?.name]
  );

  const displayName = mounted ? user?.username || 'Guest' : 'Guest';
  const initials = displayName.trim().charAt(0).toUpperCase();
  const isAdminUser = mounted && Boolean(user && (user.role === 'admin' || user.username === 'admin'));

  return (
    <header className="hd-header">
      <div className="hd-title">
        <span className="hd-brand">MusicLive</span>
        <span className="hd-sep">/</span>
        <strong className="hd-page">{pageTitle}</strong>
      </div>

      <div className="hd-actions">
        {isRoomPage && (
          <Link
            id="header-room-leave-link"
            href="/home"
            className="hd-icon-btn hd-leave"
            aria-label="Rời phòng"
            title="Rời phòng"
            onClick={() => { setKeepAlive(false); setMinimized(false); }}
          >
            <LogOut size={15} />
            <span>Rời phòng</span>
          </Link>
        )}

        {isAdminUser && (
          <Link
            id="header-admin-link"
            href="/admin"
            className="hd-icon-btn hd-admin"
            aria-label="Quản lý Admin"
            title="Quản lý Admin"
          >
            <ShieldCheck size={15} />
            <span>Admin</span>
          </Link>
        )}

        <button
          id="header-notification-button"
          type="button"
          className="hd-icon-btn"
          aria-label="Thông báo"
        >
          <Bell size={15} />
          <span className="hd-notif-dot" aria-hidden="true" />
        </button>

        <Link id="header-profile-link" href="/profile" className="hd-profile-chip">
          <span className="hd-avatar">{initials}</span>
          <span className="hd-profile-name">{displayName}</span>
          <ChevronDown size={13} className="hd-chevron" />
        </Link>

        {!isRoomPage && (
          <button
            id="header-logout-button"
            type="button"
            className="hd-icon-btn"
            aria-label="Đăng xuất"
            title="Đăng xuất"
            onClick={logout}
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </header>
  );
}
