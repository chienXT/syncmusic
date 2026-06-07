"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { userAPI } from "@/shared/lib/api";
import { songAPI } from "@/shared/lib/api";
import { roomService } from "@/features/room/room.service";
import type { Room } from "@/types/room";
import type { Song } from "@/types/song";
import "./home.css";
import Image from "next/image";

type DashboardSong = Song & {
  playCount?: number;
  likeCount?: number;
};

/* ─── Section wrapper ─────────────────────────────────────── */

interface SectionProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function DashboardSection({ title, subtitle, kicker, children, action, className = "" }: SectionProps) {
  return (
    <section className={`db-section ${className}`}>
      <div className="db-section-head">
        <div>
          {kicker && <span className="db-kicker">{kicker}</span>}
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action && <div className="db-section-action">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/* ─── Hot Rooms Section ───────────────────────────────────── */

interface HotRoomsProps {
  onJoin: (roomId: string, inviteCode?: string) => void;
}

export function HotRoomsSection({ onJoin }: HotRoomsProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    roomService.getTrendingRooms({ limit: 6 })
      .then((res) => {
        if (!cancelled) setRooms(res.data?.data?.rooms || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <DashboardSection
      title="🔥 Phòng đang hot"
      subtitle="Phòng công khai đông người nhất hiện tại"
      kicker="Hot rooms"
    >
      {isLoading ? (
        <div className="db-hot-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="db-hot-card db-hot-card--skeleton" aria-hidden="true">
              <div className="db-hot-cover-skel" />
              <div className="db-hot-info-skel">
                <div className="db-skel-line w50" />
                <div className="db-skel-line w30" />
              </div>
            </div>
          ))}
        </div>
      ) : rooms.length > 0 ? (
        <div className="db-hot-grid">
          {rooms.map((room, idx) => {
            const currentSong = room.playback?.currentSong;
            const cover = currentSong?.coverArt || "https://picsum.photos/id/104/400/200";
            const listeners = room.participants?.length || 0;
            return (
              <button
                key={room._id || `hot-${idx}`}
                type="button"
                className="db-hot-card"
                onClick={() => onJoin(room._id, room.inviteCode)}
              >
                <span className="db-hot-rank">#{idx + 1}</span>
                <Image
                  className="db-hot-cover"
                  src={cover}
                  alt={room.name || "room"}
                  width={48}
                  height={48}
                />
                <div className="db-hot-info">
                  <strong>{room.name || "Phòng nhạc"}</strong>
                  <span>👥 {listeners} · {currentSong?.title || "Đang live"}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="db-section-empty">
          <span className="db-empty-icon">🎵</span>
          <p>Chưa có phòng hot nào.</p>
        </div>
      )}
    </DashboardSection>
  );
}

/* ─── Recently Played Section ─────────────────────────────── */

interface RecentlyPlayedProps {
  onPlay: (song: DashboardSong) => void;
  onAddToQueue: (song: DashboardSong) => void;
}

export function RecentlyPlayedSection({ onPlay, onAddToQueue }: RecentlyPlayedProps) {
  const [songs, setSongs] = useState<DashboardSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    userAPI.getRecentlyPlayed()
      .then((res) => {
        if (cancelled) return;

        const payload = res.data?.data;
        const normalized = Array.isArray(payload?.recentlyPlayed)
          ? payload.recentlyPlayed
          : Array.isArray(payload?.songs)
            ? payload.songs
            : Array.isArray(payload)
              ? payload
              : [];

        setSongs(normalized);
      })
      .catch(() => {
        if (!cancelled) setSongs([]);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const visibleSongs = Array.isArray(songs) ? songs.slice(0, 5) : [];

  if (isLoading) {
    return (
      <DashboardSection title="🕘 Nghe gần đây" kicker="Recent">
        <div className="db-song-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="db-song-item db-song-item--skeleton" aria-hidden="true">
              <div className="db-skel-line w60" />
            </div>
          ))}
        </div>
      </DashboardSection>
    );
  }

  if (visibleSongs.length === 0) {
    return (
      <DashboardSection title="🕘 Nghe gần đây" kicker="Recent">
        <div className="db-section-empty">Chưa có bài hát nào được nghe gần đây.</div>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="🕘 Nghe gần đây" subtitle="Những bài bạn vừa nghe" kicker="Recent">
      <div className="db-song-list">
        {visibleSongs.map((song, idx) => (
          <div
            key={song._id || `recent-${idx}`}
            className="db-song-item"
          >
            <span className="db-song-rank">{idx + 1}</span>
            <Image
              className="db-song-cover"
              src={song.coverArt || "https://picsum.photos/id/104/400/200"}
              alt={song.title || "cover"}
              width={48}
              height={48}
            />
            <div className="db-song-info">
              <strong>{song.title || "Untitled"}</strong>
              <span>{song.artist || "Unknown"}</span>
            </div>
            <div className="db-song-actions">
              <button
                type="button"
                className="db-song-action-btn secondary"
                onClick={() => onAddToQueue(song)}
                aria-label="Thêm vào danh sách chờ"
                title="Thêm vào danh sách chờ"
              >
                ＋
              </button>
              <button
                type="button"
                className="db-song-action-btn primary"
                onClick={() => onPlay(song)}
                aria-label="Phát ngay"
                title="Phát ngay"
              >
                ▶
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}

/* ─── Liked Songs Section ─────────────────────────────────── */

interface LikedSongsProps {
  onPlay: (song: DashboardSong) => void;
  onAddToQueue: (song: DashboardSong) => void;
}

export function LikedSongsSection({ onPlay, onAddToQueue }: LikedSongsProps) {
  const [songs, setSongs] = useState<DashboardSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    songAPI.getTopLikedSongs(5)
      .then((res) => {
        if (!cancelled) setSongs(res.data?.data?.songs || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <DashboardSection title="❤️ Bài bạn đã thích" kicker="Liked">
        <div className="db-song-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="db-song-item db-song-item--skeleton" aria-hidden="true">
              <div className="db-skel-line w60" />
            </div>
          ))}
        </div>
      </DashboardSection>
    );
  }

  if (songs.length === 0) {
    return (
      <DashboardSection title="❤️ Bài bạn đã thích" kicker="Liked">
        <div className="db-section-empty">Chưa có bài hát nào được thích.</div>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="❤️ Bài bạn đã thích" subtitle="Những bạn yêu thích nhất" kicker="Liked">
      <div className="db-song-list">
        {songs.slice(0, 5).map((song, idx) => (
          <div
            key={song._id || `liked-${idx}`}
            className="db-song-item"
          >
            <span className="db-song-rank">{idx + 1}</span>
            <Image
              className="db-song-cover"
              src={song.coverArt || "https://picsum.photos/id/104/400/200"}
              alt={song.title || "cover"}
              width={48}
              height={48}
            />
            <div className="db-song-info">
              <strong>{song.title || "Untitled"}</strong>
              <span>{song.artist || "Unknown"}</span>
            </div>
            <div className="db-song-actions">
              <button
                type="button"
                className="db-song-action-btn secondary"
                onClick={() => onAddToQueue(song)}
                aria-label="Thêm vào danh sách chờ"
                title="Thêm vào danh sách chờ"
              >
                ＋
              </button>
              <button
                type="button"
                className="db-song-action-btn primary"
                onClick={() => onPlay(song)}
                aria-label="Phát ngay"
                title="Phát ngay"
              >
                ▶
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}

/* ─── User Profile Card ───────────────────────────────────── */

export function UserProfileCard() {
  const { user } = useAuthStore();
  const router = useRouter();

  if (!user) return null;

  const displayName = user.username || user.email?.split("@")[0] || "User";
  const initial = displayName[0]?.toUpperCase() || "U";

  return (
    <section className="db-profile-card">
      <div className="db-profile-avatar" onClick={() => router.push("/profile")}>
        {user.avatar ? (
          <Image
            src={user.avatar}
            alt={displayName}
            width={48}
            height={48}
          />
        ) : (
          <span>{initial}</span>
        )}
        <div className="db-profile-status online" />
      </div>
      <div className="db-profile-info">
        <h3>{displayName}</h3>
        <p>{user.bio || "Chưa có mô tả"}</p>
        <div className="db-profile-stats">
          <span>🎵 {(user as { roomCount?: number }).roomCount || 0} phòng</span>
          <span>❤️ {(user as { likeCount?: number }).likeCount || 0} thích</span>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-sm btn-outline"
        onClick={() => router.push("/profile/edit")}
      >
        ✎ Sửa
      </button>
    </section>
  );
}
