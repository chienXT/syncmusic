'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, Search, ShieldCheck, Mic2 } from 'lucide-react';

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

export default function MobileHeader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastScrollY = useRef(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const currentRoom = useRoomStore((s) => s.currentRoom);
  const setMinimized = useRoomStore((s) => s.setRoomMinimized);
  const setKeepAlive = useRoomStore((s) => s.setKeepRoomAlive);

  const isRoomPage = pathname?.startsWith('/room');

  useEffect(() => { setMounted(true); }, []);

  const pageTitle = useMemo(
    () => resolvePageTitle(pathname, currentRoom?.name),
    [pathname, currentRoom?.name],
  );

  const displayName = mounted ? user?.username || 'Guest' : 'Guest';
  const initials = displayName.trim().charAt(0).toUpperCase();
  const isAdminUser = mounted && Boolean(user && (user.role === 'admin' || user.username === 'admin'));

  // ── Hide header on scroll down, show on scroll up ──
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Focus search input when search opens ──
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  return (
    <header className={`mb-header${isHeaderVisible ? '' : ' header-hidden'}`}>
      {isSearchOpen ? (
        <>
          <button
            type="button"
            className="mb-header-btn"
            onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
            aria-label="Đóng tìm kiếm"
          >
            <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <div className="mb-search-bar">
            <Search size={16} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm bài hát, nghệ sĩ, phòng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </>
      ) : (
        <>
          {!isRoomPage && (
            <div className="mb-header-title">
              <span className="mb-header-brand">
                Music<em>Live</em>
              </span>
            </div>
          )}

          {isRoomPage && (
            <div className="mb-header-title">
              <Mic2 size={16} color="#f5a623" />
              <span className="mb-header-page">{pageTitle}</span>
            </div>
          )}

          <div className="mb-header-actions">
            <button
              type="button"
              className="mb-header-btn"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Tìm kiếm"
            >
              <Search size={18} />
            </button>

            <button
              type="button"
              className="mb-header-btn"
              aria-label="Thông báo"
            >
              <Bell size={18} />
            </button>

            {isAdminUser && (
              <Link
                href="/admin"
                className="mb-header-btn"
                aria-label="Admin"
              >
                <ShieldCheck size={18} />
              </Link>
            )}

            <Link href="/profile" className="mb-header-avatar" aria-label="Hồ sơ">
              {initials}
            </Link>

            {isRoomPage && (
              <button
                type="button"
                className="mb-header-btn"
                onClick={() => { setKeepAlive(false); setMinimized(false); }}
                aria-label="Rời phòng"
              >
                <LogOut size={18} color="#fb7185" />
              </button>
            )}
          </div>
        </>
      )}
    </header>
  );
}
