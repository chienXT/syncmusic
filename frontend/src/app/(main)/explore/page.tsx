'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { roomService } from '@/features/room/room.service';
import './explore.css';

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80';

const MOOD_TAGS = [
  { label: 'Chill', icon: '🌙' },
  { label: 'EDM', icon: '⚡' },
  { label: 'Rap Việt', icon: '🎤' },
  { label: 'Acoustic', icon: '🎸' },
  { label: 'Gaming', icon: '🎮' },
  { label: 'K-pop', icon: '✨' },
];

type ExploreRoom = {
  _id: string;
  name: string;
  description?: string;
  inviteCode?: string;
  host?: { username?: string; avatar?: string };
  participants?: Array<{ user?: { status?: string } }>;
  tags?: string[];
  genre?: string;
  listenerCount?: number;
  coverArt?: string | null;
  joinPath?: string;
  isPlaying?: boolean;
  playback?: {
    isPlaying?: boolean;
    currentSong?: {
      title?: string;
      artist?: string;
      coverArt?: string;
      thumbnail?: string;
    } | null;
  };
};

const isRoomLive = (room: ExploreRoom) => Boolean(room.isPlaying || room.playback?.isPlaying);

export default function ExplorePage() {
  const [rooms, setRooms] = useState<ExploreRoom[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadRooms = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await roomService.getTrendingRooms({
          limit: 12,
          tags: selectedMood || undefined,
        });

        if (!isMounted) return;
        const liveRooms = (response.data?.data?.rooms || []).filter(isRoomLive);
        setRooms(liveRooms);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load explore rooms:', err);
        setError('Chưa tải được danh sách phòng. Vui lòng thử lại sau.');
        setRooms([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadRooms();

    return () => {
      isMounted = false;
    };
  }, [selectedMood]);

  const roomCountLabel = useMemo(() => {
    if (isLoading) return 'Đang tải phòng';
    return `${rooms.length} phòng live`;
  }, [isLoading, rooms.length]);

  return (
    <main className="ep-page">
      <section className="ep-hero">
        <div className="ep-hero-inner">
          <span className="ep-kicker">Explore live rooms</span>
          <h1 className="ep-hero-title">Khám phá phòng nhạc<br /><em>đang live</em></h1>
          <p className="ep-hero-desc">
            Duyệt các phòng công khai đang phát nhạc theo thời gian thực, lọc theo mood
            và tham gia ngay không gian phù hợp với năng lượng hiện tại của bạn.
          </p>
          <div className="ep-hero-actions">
            <Link href="/search" className="ep-btn-primary">🔎 Tìm bài hát</Link>
            <Link href="/home" className="ep-btn-secondary">＋ Tạo phòng riêng</Link>
          </div>
          <div className="ep-hero-summary" aria-label="Tổng quan khám phá">
            <div className="ep-summary-card">
              <span>Live rooms</span>
              <strong>{isLoading ? '...' : rooms.length}</strong>
            </div>
            <div className="ep-summary-card">
              <span>Mood đang lọc</span>
              <strong>{selectedMood || 'Tất cả'}</strong>
            </div>
            <div className="ep-summary-card">
              <span>Trạng thái</span>
              <strong>{error ? 'Cần thử lại' : 'Sẵn sàng'}</strong>
            </div>
          </div>
        </div>
        <div className="ep-hero-deco" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => <span key={i} />)}
        </div>
      </section>

      <section className="ep-discovery-panel" aria-label="Bộ lọc khám phá nhanh">
        <div>
          <span className="ep-kicker">Discovery controls</span>
          <h2 className="ep-section-title">Chọn mood để tìm phòng phù hợp</h2>
          <p>Filter nhanh theo cảm xúc, thể loại hoặc không gian nghe nhạc bạn muốn tham gia.</p>
        </div>
        <div className="ep-mood-grid ep-mood-grid--compact">
          {MOOD_TAGS.map(({ label, icon }) => (
            <button
              key={label}
              type="button"
              className={`ep-mood-chip${selectedMood === label ? ' active' : ''}`}
              onClick={() => setSelectedMood((current) => current === label ? '' : label)}
            >
              <span className="ep-mood-icon">{icon}</span>
              <span>#{label}</span>
            </button>
          ))}
          {selectedMood && (
            <button type="button" className="ep-mood-chip ep-mood-chip--reset" onClick={() => setSelectedMood('')}>
              Xóa lọc
            </button>
          )}
        </div>
      </section>

      <div className="ep-section-head ep-section-head--panel">
        <div>
          <span className="ep-kicker">Live now</span>
          <h2 className="ep-section-title">Phòng nổi bật</h2>
        </div>
        <span className="ep-pill">
          <i className="ep-pulse" aria-hidden="true" />
          {roomCountLabel}
        </span>
      </div>

      <section className="ep-room-grid" aria-label="Danh sách phòng live">
        {isLoading && Array.from({ length: 3 }, (_, i) => (
          <article key={i} className="ep-room-card ep-room-card--loading" aria-label="Đang tải phòng">
            <div className="ep-room-cover" />
            <div className="ep-room-body">
              <h3 className="ep-room-name">Đang tải...</h3>
              <p className="ep-room-host">Đang đồng bộ dữ liệu backend</p>
            </div>
          </article>
        ))}

        {!isLoading && rooms.map((room) => {
          const currentSong = room.playback?.currentSong;
          const cover = room.coverArt || currentSong?.coverArt || currentSong?.thumbnail || FALLBACK_COVER;
          const listeners = room.listenerCount ?? room.participants?.length ?? 0;
          const genre = room.genre || room.tags?.[0] || 'Live Music';
          const joinHref = room.joinPath || `/room/${room.inviteCode || room._id}`;

          return (
            <article key={room._id} className="ep-room-card">
              <div
                className="ep-room-cover"
                style={{ backgroundImage: `url(${cover})` }}
                role="img"
                aria-label={room.name}
              >
                <div className="ep-room-cover-overlay" />
                <span className="ep-live-badge">
                  <i className="ep-pulse" aria-hidden="true" />
                  LIVE
                </span>
                <span className="ep-genre-tag">{genre}</span>
              </div>
              <div className="ep-room-body">
                <h3 className="ep-room-name">{room.name}</h3>
                <p className="ep-room-host">Host bởi <strong>{room.host?.username || 'SyncMusic'}</strong></p>
                {currentSong?.title && (
                  <p className="ep-room-host">Đang phát: <strong>{currentSong.title}</strong></p>
                )}
                <div className="ep-room-footer">
                  <span className="ep-listener-count">👥 {listeners}</span>
                  <Link href={joinHref} className="ep-join-btn">Tham gia →</Link>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {!isLoading && (error || rooms.length === 0) && (
        <section className="ep-empty-state" aria-live="polite">
          <span className="ep-kicker">Explore status</span>
          <h2 className="ep-section-title">{error ? 'Không tải được dữ liệu' : 'Chưa có phòng live phù hợp'}</h2>
          <p>{error || 'Hiện chưa có phòng nào đang live theo bộ lọc này. Hãy thử mood khác hoặc tạo phòng public.'}</p>
          <Link href="/home" className="ep-btn-primary">＋ Tạo phòng ngay</Link>
        </section>
      )}

      <section className="ep-mood-band" aria-label="Mood tags">
        <div className="ep-section-head">
          <div>
            <span className="ep-kicker">Mood tags</span>
            <h2 className="ep-section-title">Chọn nhanh theo cảm xúc</h2>
          </div>
          {selectedMood && (
            <button type="button" className="ep-join-btn" onClick={() => setSelectedMood('')}>
              Xóa lọc
            </button>
          )}
        </div>
        <div className="ep-mood-grid">
          {MOOD_TAGS.map(({ label, icon }) => (
            <button
              key={label}
              type="button"
              className={`ep-mood-chip${selectedMood === label ? ' active' : ''}`}
              onClick={() => setSelectedMood((current) => current === label ? '' : label)}
            >
              <span className="ep-mood-icon">{icon}</span>
              <span>#{label}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}