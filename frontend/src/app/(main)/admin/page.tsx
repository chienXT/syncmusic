'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity, BarChart3, Crown, Edit3, ListMusic,
  Music2, Radio, RefreshCw, Search,
  Trash2, UserCog, Users,
} from 'lucide-react';

import { useAuthStore } from '@/store/authStore';
import { adminAPI } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import './admin.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview', label: 'Tổng quan', icon: BarChart3 },
  { key: 'users', label: 'Người dùng', icon: Users },
  { key: 'rooms', label: 'Phòng nhạc', icon: Radio },
  { key: 'lyrics', label: 'Lyrics cache', icon: ListMusic },
] as const;

type TabKey = typeof TABS[number]['key'];

const ACCENT_MAP: Record<string, string> = {
  amber: 'ad-metric--amber',
  blue: 'ad-metric--blue',
  green: 'ad-metric--green',
  purple: 'ad-metric--purple',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (value?: string | Date) =>
  value ? new Date(value).toLocaleString('vi-VN') : '—';

const safeCount = (val: any, fallback: number | string = 0): number | string => {
  if (val == null) return fallback;
  if (Array.isArray(val)) return val.length;
  if (typeof val === 'object') return Object.keys(val).length;
  return val;
};

function isAdmin(user: any) {
  return user?.role === 'admin' || user?.username === 'admin';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MetricProps { icon: any; label: string; value: string | number; accent?: string }
function Metric({ icon: Icon, label, value, accent = 'amber' }: MetricProps) {
  return (
    <article className={`ad-metric ${ACCENT_MAP[accent] ?? ACCENT_MAP.amber}`}>
      <div className="ad-metric-body">
        <span className="ad-metric-label">{label}</span>
        <strong className="ad-metric-value">{value}</strong>
      </div>
      <div className="ad-metric-icon"><Icon size={20} /></div>
    </article>
  );
}

interface NoticeBannerProps { message: string }
function NoticeBanner({ message }: NoticeBannerProps) {
  if (!message) return null;
  return <div className="ad-notice" role="status">✓ {message}</div>;
}

interface EmptyRowProps { message: string; colSpan?: number }
function EmptyRow({ message, colSpan = 5 }: EmptyRowProps) {
  return (
    <tr><td colSpan={colSpan} className="ad-table-empty">{message}</td></tr>
  );
}

const formatLrcTime = (secondsValue: number) => {
  const safeSeconds = Math.max(0, Number(secondsValue) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);
  const centiseconds = Math.floor((safeSeconds - Math.floor(safeSeconds)) * 100);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

const linesToLrc = (lines: any[] = []) => lines
  .map((line) => {
    const start = Number(line.start ?? line.time ?? 0);
    const text = String(line.text ?? '').trim();
    if (!text) return '';
    return `[${formatLrcTime(start)}]${text}`;
  })
  .filter(Boolean)
  .join('\n');

const parseLrcTime = (value: string) => {
  const match = value.trim().match(/^(\d+):(\d{1,2})(?:[.:](\d{1,3}))?$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const fraction = match[3] ? Number(`0.${match[3].padEnd(3, '0').slice(0, 3)}`) : 0;
  return minutes * 60 + seconds + fraction;
};

const lrcToLines = (lrcText: string) => {
  const parsed = lrcText
    .split('\n')
    .flatMap((rawLine) => {
      const text = rawLine.trim();
      if (!text) return [];

      const matches = [...text.matchAll(/\[(\d+:\d{1,2}(?:[.:]\d{1,3})?)\]/g)];
      if (matches.length === 0) return [];

      const lyricText = text.replace(/\[(\d+:\d{1,2}(?:[.:]\d{1,3})?)\]/g, '').trim();
      if (!lyricText) return [];

      return matches
        .map((match) => parseLrcTime(match[1]))
        .filter((start): start is number => start !== null)
        .map((start) => ({ start, text: lyricText }));
    })
    .sort((a, b) => a.start - b.start);

  return parsed.map((line, index) => {
    const nextStart = parsed[index + 1]?.start;
    const durationMs = nextStart !== undefined
      ? Math.max(300, Math.round((nextStart - line.start) * 1000))
      : 3000;
    return { text: line.text, start: Number(line.start.toFixed(3)), duration: durationMs };
  });
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isInitialized } = useAuthStore();

  const currentTab = searchParams.get('tab');
  const initialTab = TABS.some((tab) => tab.key === currentTab) ? currentTab as TabKey : 'overview';

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [dashboard, setDashboard] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [lyrics, setLyrics] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [editingLyrics, setEditingLyrics] = useState<any>(null);
  const [lyricsEditMode, setLyricsEditMode] = useState<'json' | 'lrc'>('json');
  const [lyricsForm, setLyricsForm] = useState({ title: '', artist: '', provider: '', status: 'found', linesText: '[]', lrcText: '' });
  const [isSavingLyrics, setIsSavingLyrics] = useState(false);

  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 2600);
  }, []);

  // ── Loaders ──
  const loadOverview = useCallback(async () => {
    const res = await adminAPI.getDashboard();
    setDashboard(res.data?.data || {});
  }, []);

  const loadUsers = useCallback(async (q: string) => {
    const res = q.trim()
      ? await adminAPI.searchUsers(q.trim())
      : await adminAPI.getUsers({ page: 1, limit: 80 });
    setUsers(res.data?.data?.users || []);
  }, []);

  const loadRooms = useCallback(async (q: string) => {
    const res = await adminAPI.getRooms({ page: 1, limit: 80, search: q.trim() || undefined });
    setRooms(res.data?.data?.rooms || []);
  }, []);

  const loadLyrics = useCallback(async (q: string) => {
    const res = await adminAPI.getLyricsCache({ limit: 80, search: q.trim() || undefined });
    setLyrics(res.data?.data?.items || res.data?.data?.entries || []);
  }, []);

  const reload = useCallback(async (tab: TabKey = activeTab, q: string = query) => {
    setIsLoading(true);
    try {
      if (tab === 'overview') await loadOverview();
      else if (tab === 'users') await loadUsers(q);
      else if (tab === 'rooms') await loadRooms(q);
      else await loadLyrics(q);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, query, loadOverview, loadUsers, loadRooms, loadLyrics]);

  // ── Auth guard + initial load ──
  useEffect(() => {
    if (!isInitialized) return;
    if (!isAdmin(user)) { router.push('/'); return; }
    reload(activeTab, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, activeTab]);
  useEffect(() => {
    const nextTab = TABS.some((tab) => tab.key === currentTab) ? currentTab as TabKey : 'overview';
    setActiveTab(nextTab);
  }, [currentTab]);

  const handleTabChange = useCallback((key: TabKey) => {
    setActiveTab(key);
    setQuery('');
    router.replace(key === 'overview' ? '/admin' : `/admin?tab=${key}`, { scroll: false });
  }, [router]);

  // ── Search ──
  const handleSearch = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') reload(activeTab, query);
  }, [activeTab, query, reload]);

  // ── Metrics ──
  const metrics = useMemo(() => {
    const d = dashboard || {};
    return [
      { icon: Users, label: 'Người dùng', value: safeCount(d.totalUsers ?? d.users, users.length), accent: 'amber' },
      { icon: Radio, label: 'Phòng nhạc', value: safeCount(d.totalRooms ?? d.rooms, rooms.length), accent: 'blue' },
      { icon: Activity, label: 'Đang live', value: safeCount(d.activeRooms ?? d.onlineRooms, 0), accent: 'green' },
      { icon: Music2, label: 'Bài đã phát', value: safeCount(d.songsPlayed ?? d.totalSongs, '—'), accent: 'purple' },
    ];
  }, [dashboard, users.length, rooms.length]);

  // ── Actions ──
  const handleSetRole = useCallback(async (userId: string, role: string) => {
    await adminAPI.setUserRole(userId, role);
    flash('Đã cập nhật quyền người dùng');
    loadUsers(query);
  }, [flash, loadUsers, query]);

  const handleDeleteRoom = useCallback(async (roomId: string) => {
    if (!confirm('Xóa phòng này?')) return;
    await adminAPI.deleteRoom(roomId);
    flash('Đã xóa phòng');
    loadRooms(query);
  }, [flash, loadRooms, query]);

  const handleDeleteLyrics = useCallback(async (sourceId: string) => {
    if (!confirm('Xóa lyrics cache này?')) return;
    await adminAPI.deleteLyricsCache(sourceId);
    flash('Đã xóa lyrics cache');
    loadLyrics(query);
  }, [flash, loadLyrics, query]);

  const handleOpenLyricsEditor = useCallback((item: any) => {
    const oldTitle = item.title || item.songTitle || item.name || item.sourceTitle || '';
    const oldArtist = item.artist || item.songArtist || item.author || item.channelTitle || '';
    const lines = item.lines || [];
    setEditingLyrics(item);
    setLyricsEditMode('json');
    setLyricsForm({
      title: oldTitle,
      artist: oldArtist,
      provider: item.provider || 'manual_admin',
      status: item.status || 'found',
      linesText: JSON.stringify(lines, null, 2),
      lrcText: linesToLrc(lines),
    });
  }, []);

  const handleCloseLyricsEditor = useCallback(() => {
    if (isSavingLyrics) return;
    setEditingLyrics(null);
  }, [isSavingLyrics]);

  const handleSaveLyrics = useCallback(async () => {
    if (!editingLyrics?.sourceId) return;

    let parsedLines: any[];
    if (lyricsEditMode === 'json') {
      try {
        parsedLines = JSON.parse(lyricsForm.linesText);
      } catch {
        alert('Lyrics JSON không hợp lệ. Vui lòng kiểm tra lại dấu phẩy/dấu ngoặc.');
        return;
      }

      if (!Array.isArray(parsedLines)) {
        alert('Lyrics phải là một mảng JSON.');
        return;
      }
    } else {
      parsedLines = lrcToLines(lyricsForm.lrcText);
      if (!parsedLines.length) {
        alert('Lyrics LRC không hợp lệ. Vui lòng dùng dạng [mm:ss.xx]Nội dung lời.');
        return;
      }
    }

    setIsSavingLyrics(true);
    try {
      await adminAPI.updateLyricsCache(editingLyrics.sourceId, {
        title: lyricsForm.title,
        artist: lyricsForm.artist,
        provider: lyricsForm.provider || 'manual_admin',
        status: lyricsForm.status,
        lines: parsedLines,
      });
      flash('Đã cập nhật lyrics cache');
      setEditingLyrics(null);
      await loadLyrics(query);
    } finally {
      setIsSavingLyrics(false);
    }
  }, [editingLyrics, flash, loadLyrics, lyricsEditMode, lyricsForm, query]);

  // ── Guards ──
  if (!isInitialized) {
    return (
      <div className="ad-loading"><LoadingSpinner size="lg" /></div>
    );
  }
  if (!isAdmin(user)) return null;

  // ── Render ──
  return (
    <div className="ad-page">
      <div className="ad-layout">



        {/* ── Main ── */}
        <main className="ad-main">

          {/* Hero / toolbar */}
          <section className="ad-hero">
            <div className="ad-hero-text">
              <span className="ad-kicker">Premium Control Center</span>
              <h1 className="ad-hero-title">Quản trị hệ thống</h1>
              <p className="ad-hero-desc">
                Theo dõi người dùng, phòng nghe nhạc, lyrics cache và trạng thái live trong một giao diện tối giản.
              </p>
            </div>
            <div className="ad-hero-actions">
              <div className="ad-search">
                <Search size={14} className="ad-search-icon" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  placeholder="Tìm kiếm... (Enter)"
                  aria-label="Tìm kiếm"
                />
              </div>
              <button
                type="button"
                className="ad-refresh-btn"
                onClick={() => reload()}
                aria-label="Làm mới"
              >
                <RefreshCw size={14} className={isLoading ? 'spinning' : ''} />
                Làm mới
              </button>
            </div>
          </section>

          <NoticeBanner message={notice} />

          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <>
              <div className="ad-metrics">
                {metrics.map((m) => <Metric key={m.label} {...m} />)}
              </div>

              <div className="ad-overview-grid">
                <div className="ad-card">
                  <h2 className="ad-card-title">Trạng thái hệ thống</h2>
                  <div className="ad-status-list">
                    {[
                      { label: 'API hoạt động', status: 'online' },
                      { label: 'Socket realtime', status: 'online' },
                      { label: 'Auth bảo mật', status: 'online' },
                      { label: 'Lyrics cache', status: 'cached' },
                    ].map(({ label, status }) => (
                      <div key={label} className="ad-status-row">
                        <span>{label}</span>
                        <span className={`ad-status-badge ad-status--${status}`}>
                          {status === 'cached' ? 'Cached' : 'Online'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ad-card">
                  <h2 className="ad-card-title">Hoạt động gần đây</h2>
                  <div className="ad-activity-list">
                    {rooms.length > 0
                      ? rooms.slice(0, 5).map((room) => (
                        <div key={room._id} className="ad-activity-row">
                          <span className="ad-activity-icon"><Radio size={14} /></span>
                          <div className="ad-activity-info">
                            <p>{room.name}</p>
                            <span>{room.isActive ? 'Đang live' : 'Không hoạt động'}</span>
                          </div>
                          {room.isActive && <span className="ad-live-dot" aria-hidden="true" />}
                        </div>
                      ))
                      : <p className="ad-empty-text">Chưa có dữ liệu hoạt động.</p>
                    }
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Users ── */}
          {activeTab === 'users' && (
            <div className="ad-card">
              <div className="ad-card-head">
                <h2 className="ad-card-title">Người dùng</h2>
                <span className="ad-count-pill">{users.length} tài khoản</span>
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Ngày tạo</th>
                      <th className="ad-th-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={5} className="ad-table-empty">Đang tải...</td></tr>
                    ) : users.length > 0 ? users.map((u) => (
                      <tr key={u._id}>
                        <td className="ad-td-bold">{u.username}</td>
                        <td className="ad-td-muted">{u.email}</td>
                        <td>
                          <span className={`ad-role-badge${u.role === 'admin' ? ' ad-role--admin' : ''}`}>
                            {u.role || 'user'}
                          </span>
                        </td>
                        <td className="ad-td-muted ad-td-mono">{fmt(u.createdAt)}</td>
                        <td>
                          <div className="ad-action-row">
                            <button
                              type="button"
                              className="ad-action-btn ad-action--admin"
                              onClick={() => handleSetRole(u._id, 'admin')}
                              aria-label="Cấp quyền admin"
                            >
                              <Crown size={12} /> Admin
                            </button>
                            <button
                              type="button"
                              className="ad-action-btn ad-action--user"
                              onClick={() => handleSetRole(u._id, 'user')}
                              aria-label="Hạ quyền user"
                            >
                              <UserCog size={12} /> User
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : <EmptyRow message="Không có người dùng." />}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Rooms ── */}
          {activeTab === 'rooms' && (
            <div className="ad-rooms-grid">
              {isLoading ? (
                <div className="ad-loading-inline"><LoadingSpinner size="sm" /></div>
              ) : rooms.length > 0 ? rooms.map((room) => (
                <div key={room._id} className="ad-room-card">
                  <div className="ad-room-card-top">
                    <div className="ad-room-card-info">
                      <p className="ad-room-type">{room.isPrivate ? '🔒 Riêng tư' : '🌐 Công khai'}</p>
                      <h3 className="ad-room-name">{room.name}</h3>
                      <p className="ad-room-desc">{room.description || 'Không có mô tả'}</p>
                    </div>
                    <span className={`ad-live-badge${room.isActive ? ' active' : ''}`}>
                      {room.isActive ? 'Live' : 'Off'}
                    </span>
                  </div>
                  <div className="ad-room-card-foot">
                    <span className="ad-room-stat">👥 {room.participants?.length ?? 0} người nghe</span>
                    <button
                      type="button"
                      className="ad-action-btn ad-action--danger"
                      onClick={() => handleDeleteRoom(room._id)}
                      aria-label={`Xóa phòng ${room.name}`}
                    >
                      <Trash2 size={12} /> Xóa
                    </button>
                  </div>
                </div>
              )) : (
                <p className="ad-card ad-empty-text" style={{ padding: '32px', textAlign: 'center' }}>Không có phòng.</p>
              )}
            </div>
          )}

          {/* ── Lyrics ── */}
          {activeTab === 'lyrics' && (
            <div className="ad-card">
              <h2 className="ad-card-title" style={{ marginBottom: 16 }}>Lyrics cache</h2>
              <div className="ad-lyrics-list">
                {isLoading ? (
                  <div className="ad-loading-inline"><LoadingSpinner size="sm" /></div>
                ) : lyrics.length > 0 ? lyrics.map((item, idx) => (
                  <div key={item.sourceId || item._id || idx} className="ad-lyrics-row">
                    <div className="ad-lyrics-info">
                      <p className="ad-lyrics-title">
                        {item.title || item.songTitle || item.name || item.sourceTitle || 'Chưa có tên bài hát'}
                      </p>
                      <p className="ad-lyrics-meta">
                        {item.artist || item.songArtist || item.author || item.channelTitle || item.provider || 'Chưa có ca sĩ'} · ID: {item.sourceId}
                      </p>
                    </div>
                    {item.sourceId && (
                      <div className="ad-action-row">
                        <button
                          type="button"
                          className="ad-action-btn ad-action--user"
                          onClick={() => handleOpenLyricsEditor(item)}
                          aria-label="Sửa lyrics cache"
                        >
                          <Edit3 size={12} /> Sửa
                        </button>
                        <button
                          type="button"
                          className="ad-action-btn ad-action--danger"
                          onClick={() => handleDeleteLyrics(item.sourceId)}
                          aria-label="Xóa lyrics cache"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )) : <p className="ad-empty-text" style={{ padding: '32px', textAlign: 'center' }}>Không có lyrics cache.</p>}
              </div>
            </div>
          )}

          {editingLyrics && (
            <div className="ad-modal-overlay" role="dialog" aria-modal="true" aria-label="Sửa lyrics cache">
              <div className="ad-lyrics-editor">
                <div className="ad-editor-head">
                  <div>
                    <span className="ad-kicker">Lyrics cache editor</span>
                    <h2 className="ad-card-title">Sửa lời bài hát</h2>
                    <p className="ad-editor-sub">Source ID: {editingLyrics.sourceId}</p>
                  </div>
                  <button type="button" className="ad-editor-close" onClick={handleCloseLyricsEditor} aria-label="Đóng">×</button>
                </div>

                <div className="ad-editor-current">
                  <div>
                    <span>Tên bài hát cũ</span>
                    <strong>{editingLyrics.title || editingLyrics.songTitle || editingLyrics.name || editingLyrics.sourceTitle || 'Chưa có tên bài hát'}</strong>
                  </div>
                  <div>
                    <span>Ca sĩ cũ</span>
                    <strong>{editingLyrics.artist || editingLyrics.songArtist || editingLyrics.author || editingLyrics.channelTitle || 'Chưa có ca sĩ'}</strong>
                  </div>
                  <div>
                    <span>Provider cũ</span>
                    <strong>{editingLyrics.provider || 'manual_admin'}</strong>
                  </div>
                </div>

                <div className="ad-editor-grid">
                  <label>
                    <span>Tiêu đề</span>
                    <input value={lyricsForm.title} onChange={(e) => setLyricsForm((form) => ({ ...form, title: e.target.value }))} />
                  </label>
                  <label>
                    <span>Nghệ sĩ</span>
                    <input value={lyricsForm.artist} onChange={(e) => setLyricsForm((form) => ({ ...form, artist: e.target.value }))} />
                  </label>
                  <label>
                    <span>Provider</span>
                    <input value={lyricsForm.provider} onChange={(e) => setLyricsForm((form) => ({ ...form, provider: e.target.value }))} />
                  </label>
                  <label>
                    <span>Trạng thái</span>
                    <select value={lyricsForm.status} onChange={(e) => setLyricsForm((form) => ({ ...form, status: e.target.value }))}>
                      <option value="found">found</option>
                      <option value="empty">empty</option>
                    </select>
                  </label>
                </div>

                <div className="ad-editor-mode" role="tablist" aria-label="Chọn kiểu sửa lyrics">
                  <button
                    type="button"
                    className={lyricsEditMode === 'json' ? 'active' : ''}
                    onClick={() => setLyricsEditMode('json')}
                  >
                    Sửa dạng JSON
                  </button>
                  <button
                    type="button"
                    className={lyricsEditMode === 'lrc' ? 'active' : ''}
                    onClick={() => setLyricsEditMode('lrc')}
                  >
                    Sửa dạng LRC
                  </button>
                </div>

                <label className="ad-editor-lines">
                  <span>{lyricsEditMode === 'json' ? 'Lyrics lines JSON' : 'Lyrics LRC'}</span>
                  <textarea
                    value={lyricsEditMode === 'json' ? lyricsForm.linesText : lyricsForm.lrcText}
                    onChange={(e) => setLyricsForm((form) => lyricsEditMode === 'json'
                      ? ({ ...form, linesText: e.target.value })
                      : ({ ...form, lrcText: e.target.value }))}
                    placeholder={lyricsEditMode === 'json'
                      ? '[{"start": 18.78, "duration": 2560, "text": "..."}]'
                      : '[00:18.78]Từ lần đầu tiên ta đi bên nhau'}
                    spellCheck={false}
                  />
                </label>

                <div className="ad-editor-actions">
                  <button type="button" className="ad-action-btn ad-action--user" onClick={handleCloseLyricsEditor} disabled={isSavingLyrics}>Hủy</button>
                  <button type="button" className="ad-refresh-btn" onClick={handleSaveLyrics} disabled={isSavingLyrics}>
                    {isSavingLyrics ? 'Đang lưu...' : 'Lưu lyrics'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}