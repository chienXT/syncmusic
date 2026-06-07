'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import './playlists.css';
import { playlistAPI } from '@/shared/lib/api';

type PlaylistSong = {
  _id?: string;
  title?: string;
  artist?: string;
  duration?: number;
  coverArt?: string | null;
};

type PlaylistItem = {
  _id: string;
  name: string;
  description?: string;
  coverArt?: string | null;
  color?: string;
  isPublic?: boolean;
  playCount?: number;
  followerCount?: number;
  songCount?: number;
  tags?: string[];
  songs?: PlaylistSong[];
  createdAt?: string;
};

const FALLBACK_COVER = 'https://picsum.photos/id/105/600/400';

const ACCENT_CLASS: Record<string, string> = {
  '#8b5cf6': 'purple',
  '#f59e0b': 'amber',
  '#10b981': 'green',
  '#3b82f6': 'blue',
};

const COLOR_LABELS: Record<string, string> = {
  '#8b5cf6': 'Tím',
  '#f59e0b': 'Vàng',
  '#10b981': 'Xanh lá',
  '#3b82f6': 'Xanh dương',
};

function formatDuration(seconds?: number) {
  if (!seconds || Number.isNaN(seconds)) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
}

export default function PlaylistsPage() {
  const [myPlaylists, setMyPlaylists] = useState<PlaylistItem[]>([]);
  const [publicPlaylists, setPublicPlaylists] = useState<PlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeView, setActiveView] = useState<'mine' | 'public'>('mine');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ name: '', description: '', isPublic: false, color: '#8b5cf6' });

  const loadPlaylists = async () => {
    setIsLoading(true);
    try {
      const [mineRes, publicRes] = await Promise.all([
        playlistAPI.getUserPlaylists('me'),
        playlistAPI.getPublicPlaylists({ limit: 12 }),
      ]);
      setMyPlaylists(mineRes.data?.data?.playlists || []);
      setPublicPlaylists(publicRes.data?.data?.playlists || []);
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.response?.data?.message || error?.message || 'Không tải được playlist.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadPlaylists(); }, []);

  const recentAdds = useMemo(() => {
    const firstPlaylist = myPlaylists[0];
    return (firstPlaylist?.songs || []).slice(0, 5).map((song, index) => ({
      title: song.title || `Bài hát ${index + 1}`,
      artist: song.artist || 'Chưa rõ nghệ sĩ',
      duration: formatDuration(song.duration),
    }));
  }, [myPlaylists]);

  const playlistsToShow = activeView === 'mine' ? myPlaylists : publicPlaylists;

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Tên playlist không được để trống.' });
      return;
    }
    setIsCreating(true);
    setMessage(null);
    try {
      await playlistAPI.createPlaylist({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        isPublic: form.isPublic,
        color: form.color,
      });
      setForm({ name: '', description: '', isPublic: false, color: '#8b5cf6' });
      setShowModal(false);
      setMessage({ type: 'success', text: 'Đã tạo playlist mới.' });
      await loadPlaylists();
      setActiveView('mine');
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.response?.data?.message || error?.message || 'Tạo playlist thất bại.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleFollow = async (playlistId: string) => {
    try {
      await playlistAPI.toggleFollowPlaylist(playlistId);
      await loadPlaylists();
      setMessage({ type: 'success', text: 'Đã cập nhật theo dõi playlist.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.response?.data?.message || error?.message || 'Không thể theo dõi playlist.' });
    }
  };

  return (
    <main className="pl-page">

      {/* ── Hero ── */}
      <section className="pl-hero">
        <div className="pl-hero-inner">
          <span className="pl-kicker">Library</span>
          <h1 className="pl-hero-title">
            Playlist
            <em>của bạn</em>
          </h1>
          <p className="pl-hero-desc">
            Quản lý playlist thật từ backend — tạo mới, xem playlist của tôi
            và khám phá bộ sưu tập công khai từ cộng đồng.
          </p>
          <div className="pl-hero-actions">
            <button type="button" className="pl-btn-primary" onClick={() => setShowModal(true)}>
              ＋ Tạo playlist
            </button>
            <Link href="/search" className="pl-btn-secondary">🔎 Thêm bài hát</Link>
          </div>
        </div>

        {/* Vinyl decoration */}
        <div className="pl-hero-vinyl" aria-hidden="true">
          <div className="pl-vinyl-disc">
            <div className="pl-vinyl-groove" />
            <div className="pl-vinyl-label">♫</div>
          </div>
        </div>
      </section>

      {/* ── Create Playlist Modal ── */}
      {showModal && (
        <div
          className="pl-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Tạo playlist mới"
          onClick={() => setShowModal(false)}
        >
          <div className="pl-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pl-modal-header">
              <h3>Tạo Playlist Mới</h3>
              <button
                type="button"
                className="pl-modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Đóng"
              >×</button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="pl-modal-form">
              <div className="pl-form-group">
                <label htmlFor="pl-name">Tên Playlist</label>
                <input
                  id="pl-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ví dụ: Nhạc chill cuối tuần..."
                  autoFocus
                  maxLength={80}
                />
              </div>

              <div className="pl-form-group">
                <label htmlFor="pl-desc">Mô tả <span style={{ opacity: .5, fontWeight: 400 }}>(Tùy chọn)</span></label>
                <textarea
                  id="pl-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Kể gì đó về playlist này..."
                  rows={3}
                  maxLength={300}
                />
              </div>

              <div className="pl-form-row">
                <label className="pl-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                  />
                  <span>Công khai playlist này</span>
                </label>

                <div className="pl-color-picker">
                  <label>Màu sắc</label>
                  <div className="pl-colors">
                    {Object.entries(ACCENT_CLASS).map(([hex]) => (
                      <button
                        key={hex}
                        type="button"
                        className={`pl-color-btn${form.color === hex ? ' active' : ''}`}
                        style={{ backgroundColor: hex }}
                        onClick={() => setForm({ ...form, color: hex })}
                        aria-label={COLOR_LABELS[hex] || hex}
                        title={COLOR_LABELS[hex] || hex}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pl-modal-actions">
                <button type="button" className="pl-btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="pl-btn-primary" disabled={isCreating}>
                  {isCreating ? 'Đang tạo...' : 'Xác nhận tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Section header ── */}
      <div className="pl-section-head">
        <div>
          <span className="pl-kicker">Collections</span>
          <h2 className="pl-section-title">Bộ sưu tập nổi bật</h2>
        </div>
        <div className="pl-actions-inline">
          <button
            type="button"
            className={`pl-filter-btn${activeView === 'mine' ? ' active' : ''}`}
            onClick={() => setActiveView('mine')}
          >Của tôi</button>
          <button
            type="button"
            className={`pl-filter-btn${activeView === 'public' ? ' active' : ''}`}
            onClick={() => setActiveView('public')}
          >Công khai</button>
          <span className="pl-pill">{playlistsToShow.length} playlist</span>
        </div>
      </div>

      {/* Banner */}
      {message && (
        <div className={`pl-banner ${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      {/* ── Grid ── */}
      <section className="pl-grid" aria-label="Danh sách playlist">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <article key={i} className="pl-card pl-card--amber">
              <div className="pl-skel" />
            </article>
          ))
        ) : playlistsToShow.length > 0 ? (
          playlistsToShow.map((pl) => {
            const accent = ACCENT_CLASS[pl.color || '#8b5cf6'] || 'purple';
            const cover = pl.coverArt || FALLBACK_COVER;
            const songCount = pl.songCount ?? pl.songs?.length ?? 0;
            return (
              <article key={pl._id} className={`pl-card pl-card--${accent}`}>
                <div className="pl-card-top">
                  <span
                    className="pl-card-icon"
                    style={pl.coverArt ? {
                      backgroundImage: `url(${cover})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    } : undefined}
                  >
                    {!pl.coverArt ? '♪' : null}
                  </span>
                  <div className="pl-card-meta">
                    <span className="pl-card-mood">{pl.isPublic ? 'Công khai' : 'Riêng tư'}</span>
                    <span className="pl-card-count">{songCount} bài</span>
                  </div>
                </div>

                <div className="pl-card-body">
                  <h3 className="pl-card-name" title={pl.name}>{pl.name}</h3>
                  <p className="pl-card-desc">{pl.description || 'Chưa có mô tả cho playlist này.'}</p>
                </div>

                <div className="pl-card-foot">
                  <div className="pl-card-bars" aria-hidden="true">
                    {Array.from({ length: 5 }, (_, i) => <span key={i} />)}
                  </div>
                  <div className="pl-card-links">
                    <span className="pl-card-count" style={{ fontSize: 12, opacity: .7 }}>
                      ♥ {pl.followerCount ?? 0}
                    </span>
                    <button
                      type="button"
                      className="pl-open-btn"
                      onClick={() => handleToggleFollow(pl._id)}
                    >
                      {pl.isPublic ? 'Theo dõi' : 'Mở'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="pl-empty">
            {activeView === 'mine'
              ? 'Bạn chưa có playlist nào. Nhấn "Tạo playlist" để bắt đầu!'
              : 'Chưa có playlist công khai nào.'}
          </div>
        )}
      </section>

      {/* ── Recently Added ── */}
      <section className="pl-recent">
        <div className="pl-section-head" style={{ padding: '0 0 16px' }}>
          <div>
            <span className="pl-kicker">Recently added</span>
            <h2 className="pl-section-title">Bài mới thêm gần đây</h2>
          </div>
          <Link href="/search" className="pl-see-more">Xem tất cả →</Link>
        </div>

        <div className="pl-recent-list">
          {recentAdds.length > 0 ? (
            recentAdds.map((song, idx) => (
              <div key={`${song.title}-${idx}`} className="pl-recent-row">
                <span className="pl-recent-index">{String(idx + 1).padStart(2, '0')}</span>
                <div className="pl-recent-info">
                  <strong className="pl-recent-title">{song.title}</strong>
                  <span className="pl-recent-artist">{song.artist}</span>
                </div>
                <span className="pl-recent-dur">{song.duration}</span>
                <button
                  type="button"
                  className="pl-recent-add"
                  aria-label={`Thêm ${song.title} vào playlist`}
                >＋</button>
              </div>
            ))
          ) : (
            <div className="pl-empty pl-empty--compact">
              Playlist của bạn chưa có bài nào. Hãy thêm bài đầu tiên từ{' '}
              <Link href="/search" style={{ color: 'var(--pl-gold)' }}>Search</Link>.
            </div>
          )}
        </div>
      </section>

    </main>
  );
}