'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  Compass,
  Heart,
  Home,
  ListMusic,
  Mic2,
  Radio,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { useAuthStore } from '@/store/authStore';
import { useRoomStore } from '@/store/roomStore';
import { roomService } from '@/features/room/room.service';
import type { Room } from '@/types/room';

const NAV_ITEMS = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/explore', label: 'Khám phá', icon: Compass },
  { href: '/room', label: 'Phòng của tôi', icon: Mic2, isRoom: true },
  { href: '/playlists', label: 'Playlist', icon: ListMusic },
  { href: '/favorites', label: 'Yêu thích', icon: Heart },
  { href: '/settings', label: 'Cài đặt', icon: Settings },
] as const;

const ADMIN_CHILD_LINKS = [
  { href: '/admin', label: 'Tổng quan', icon: BarChart3 },
  { href: '/admin?tab=users', label: 'Người dùng', icon: Users },
  { href: '/admin?tab=rooms', label: 'Phòng nhạc', icon: Radio },
  { href: '/admin?tab=lyrics', label: 'Lyrics cache', icon: ListMusic },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [hostedRoom, setHostedRoom] = useState<Room | null>(null);
  const [hasFetchedHosted, setHasFetchedHosted] = useState(false);
  const [isAdminExpanded, setIsAdminExpanded] = useState(false);

  const user = useAuthStore((s) => s.user);
  const room = useRoomStore((s) => s.currentRoom);
  const setMinimized = useRoomStore((s) => s.setRoomMinimized);
  const setKeepAlive = useRoomStore((s) => s.setKeepRoomAlive);

  const currentRoomId = room?._id || user?.currentRoom?._id || hostedRoom?._id;
  const roomRouteId =
    room?.inviteCode ||
    user?.currentRoom?.inviteCode ||
    hostedRoom?.inviteCode ||
    currentRoomId;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (pathname?.startsWith('/admin')) setIsAdminExpanded(true);
  }, [pathname]);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !user || room || user.currentRoom || hasFetchedHosted) {
      return;
    }

    roomService
      .getMyHostedRoom()
      .then((res) => setHostedRoom(res.data.data.room ?? null))
      .catch(() => setHostedRoom(null))
      .finally(() => setHasFetchedHosted(true));
  }, [isAuthenticated, room, user, hasFetchedHosted]);

  const navItems = useMemo(
    () =>
      NAV_ITEMS.map((item) =>
        'isRoom' in item && item.isRoom && mounted && roomRouteId
          ? { ...item, href: `/room/${roomRouteId}` }
          : item,
      ),
    [mounted, roomRouteId],
  );

  const isActive = (href: string) =>
    href === pathname ||
    (href === '/home' && pathname === '/') ||
    (href.startsWith('/room') && pathname?.startsWith('/room'));

  const isAdminUser = mounted && Boolean(user && (user.role === 'admin' || user.username === 'admin'));

  return (
    <aside className="sl-sidebar" aria-label="Melodic navigation">
      <Link href="/home" className="sl-brand">
        <span className="sl-brand-icon">
          <Mic2 size={16} />
        </span>
        <span className="sl-brand-name">
          Music<em>Live</em>
        </span>
      </Link>

      <nav className="sl-nav" aria-label="Điều hướng ứng dụng">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`sl-nav-link${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                if (
                  pathname?.startsWith('/room') &&
                  !item.href.startsWith('/room') &&
                  currentRoomId
                ) {
                  setKeepAlive(true);
                  setMinimized(true);
                }
              }}
            >
              <span className="sl-nav-icon">
                <Icon size={16} />
              </span>
              <span className="sl-nav-label">{item.label}</span>
              {active && <span className="sl-nav-pip" aria-hidden="true" />}
            </Link>
          );
        })}
      </nav>

      {isAdminUser && (
        <div className="sl-admin-group">
          <div className="sl-admin-head">
            <Link
              id="sidebar-admin-link"
              href="/admin"
              className={`sl-admin-link${pathname?.startsWith('/admin') ? ' active' : ''}`}
              aria-current={pathname?.startsWith('/admin') ? 'page' : undefined}
            >
              <span className="sl-nav-icon">
                <ShieldCheck size={16} />
              </span>
              <span className="sl-nav-label">Quản lý Admin</span>
            </Link>
            <button
              type="button"
              className={`sl-admin-toggle${isAdminExpanded ? ' expanded' : ''}`}
              onClick={() => setIsAdminExpanded((value) => !value)}
              aria-label={isAdminExpanded ? 'Thu gọn quản lý admin' : 'Mở rộng quản lý admin'}
              aria-expanded={isAdminExpanded}
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {isAdminExpanded && (
            <div className="sl-admin-subnav" aria-label="Điều hướng con quản lý admin">
              {ADMIN_CHILD_LINKS.map((item) => {
                const Icon = item.icon;
                const activeTab = searchParams.get('tab') || 'overview';
                const targetTab = item.href.includes('tab=') ? item.href.split('tab=')[1] : 'overview';
                const active = pathname === '/admin' && activeTab === targetTab;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sl-admin-sub-link${active ? ' active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={13} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}