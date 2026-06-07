"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useRoomStore } from "@/store/roomStore";
import { roomService } from "@/features/room/room.service";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/constants/socket";
import { songAPI } from "@/shared/lib/api";
import Image from "next/image";
import type { Room } from "@/types/room";
import type { Song } from "@/types/song";
import "./home.css";
import { HotRoomsSection, RecentlyPlayedSection, LikedSongsSection, UserProfileCard } from "./components";

// ─── Constants ────────────────────────────────────────────────────────────────

type Tab = "my" | "joined" | "discover";
type Filter =
  | "Tất cả"
  | "Live"
  | "Công khai"
  | "Riêng tư"
  | "Đông người"
  | "Chill"
  | "Study"
  | "Gaming";

type DashboardSong = Song & {
  playCount?: number;
  likeCount?: number;
};

const FILTERS: Filter[] = [
  "Tất cả",
  "Live",
  "Công khai",
  "Riêng tư",
  "Đông người",
  "Chill",
  "Study",
  "Gaming",
];
const TABS: { id: Tab; label: string }[] = [
  { id: "my", label: "Phòng của tôi" },
  { id: "joined", label: "Đã tham gia" },
  { id: "discover", label: "Khám phá" },
];
const GENRE_OPTIONS = [
  "electronic",
  "chill",
  "rock",
  "hip-hop",
  "jazz",
  "lo-fi",
];
const SONG_COVER_FALLBACK = "https://picsum.photos/id/104/400/200";

const showDashboardToast = (
  message: string,
  type: "success" | "error" = "success",
) => {
  if (typeof document === "undefined") return;

  let container = document.getElementById("dashboard-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "dashboard-toast-container";
    container.style.position = "fixed";
    container.style.right = "24px";
    container.style.bottom = "24px";
    container.style.zIndex = "9999";
    container.style.display = "grid";
    container.style.gap = "12px";
    container.style.pointerEvents = "none";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.setAttribute("role", "status");
  toast.style.pointerEvents = "auto";
  toast.style.minWidth = "280px";
  toast.style.maxWidth = "360px";
  toast.style.padding = "14px 16px";
  toast.style.borderRadius = "16px";
  toast.style.color = type === "success" ? "#eafff8" : "#fff1f2";
  toast.style.background =
    type === "success"
      ? "linear-gradient(135deg, rgba(22, 101, 83, 0.96), rgba(18, 42, 38, 0.96))"
      : "linear-gradient(135deg, rgba(127, 29, 29, 0.96), rgba(50, 18, 22, 0.96))";
  toast.style.border =
    type === "success"
      ? "1px solid rgba(103, 200, 171, 0.45)"
      : "1px solid rgba(248, 113, 113, 0.45)";
  toast.style.boxShadow = "0 18px 42px rgba(0, 0, 0, 0.28)";
  toast.style.backdropFilter = "blur(14px)";
  toast.style.transform = "translateY(10px)";
  toast.style.opacity = "0";
  toast.style.transition = "opacity 180ms ease, transform 180ms ease";
  toast.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <span style="width:28px;height:28px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.14);font-weight:800;flex:0 0 auto;">
        ${type === "success" ? "✓" : "!"}
      </span>
      <div style="min-width:0;">
        <strong style="display:block;font-size:13px;margin-bottom:3px;">${type === "success" ? "Thông báo" : "Có lỗi xảy ra"}</strong>
        <span style="display:block;font-size:12px;line-height:1.45;opacity:.86;">${message}</span>
      </div>
    </div>
  `;

  container.appendChild(toast);
  window.requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    window.setTimeout(() => toast.remove(), 220);
  }, 3200);
};

const MOCK_ROOMS: Room[] = [
  {
    _id: "1",
    name: "Midnight Vibes",
    description: "Chill electronic beats for late night coding",
    host: { _id: "host1", username: "Minh An" },
    isPrivate: false,
    isActive: true,
    participants: Array(12).fill({ _id: "p1", username: "User" }),
    playback: {
      currentSong: {
        _id: "s1",
        title: "Midnight Silhouette",
        artist: "Luna Wave",
        coverArt: "https://picsum.photos/id/104/400/200",
        duration: 262,
      },
      currentTime: 120,
      isPlaying: true,
      lastUpdateTime: Date.now(),
    },
    tags: ["electronic", "chill"],
    inviteCode: "M1DNIGHT",
    moderators: [],
    maxParticipants: 50,
    queue: [],
    settings: {
      allowSkip: true,
      voteSkipThreshold: 3,
      allowQueue: true,
      autoPlay: true,
    },
  },
  {
    _id: "2",
    name: "Chill & Study",
    description: "Lo-fi beats for concentration",
    host: { _id: "host1", username: "Minh An" },
    isPrivate: true,
    isActive: true,
    participants: Array(5).fill({ _id: "p2", username: "User" }),
    playback: {
      currentSong: {
        _id: "s2",
        title: "Coffee Shop",
        artist: "Lo-fi Producer",
        coverArt: "https://picsum.photos/id/169/400/200",
        duration: 180,
      },
      currentTime: 45,
      isPlaying: true,
      lastUpdateTime: Date.now(),
    },
    tags: ["lo-fi", "study"],
    inviteCode: "STUDYNOW",
    moderators: [],
    maxParticipants: 20,
    queue: [],
    settings: {
      allowSkip: true,
      voteSkipThreshold: 3,
      allowQueue: true,
      autoPlay: true,
    },
  },
  {
    _id: "3",
    name: "Rock Anthems",
    description: "Classic and modern rock hits",
    host: { _id: "host1", username: "Minh An" },
    isPrivate: false,
    isActive: true,
    participants: Array(8).fill({ _id: "p3", username: "User" }),
    playback: {
      currentSong: {
        _id: "s3",
        title: "Bohemian Rhapsody",
        artist: "Queen",
        coverArt: "https://picsum.photos/id/96/400/200",
        duration: 354,
      },
      currentTime: 180,
      isPlaying: true,
      lastUpdateTime: Date.now(),
    },
    tags: ["rock", "classic"],
    inviteCode: "ROCKON",
    moderators: [],
    maxParticipants: 100,
    queue: [],
    settings: {
      allowSkip: true,
      voteSkipThreshold: 3,
      allowQueue: true,
      autoPlay: true,
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterRooms(
  rooms: Room[],
  tab: Tab,
  query: string,
  filter: Filter,
  userId?: string,
): Room[] {
  let list = [...rooms];

  if (tab === "my") {
    list = list.filter((r) => r.host?._id === userId);
  }

  if (tab === "joined") {
    list = list.filter((r) => {
      const isOwner = r.host?._id === userId;
      const isParticipant = r.participants?.some(
        (p) => (p as { _id?: string; id?: string })._id === userId || (p as { _id?: string; id?: string }).id === userId,
      );
      return !isOwner && Boolean(isParticipant);
    });
  }

  if (tab === "discover") {
    list = list
      .filter((r) => !r.isPrivate)
      .sort(
        (a, b) => (b.participants?.length ?? 0) - (a.participants?.length ?? 0),
      )
      .slice(0, 12);
  }

  if (query.trim()) {
    const q = query.trim().toLowerCase();
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.host?.username?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.inviteCode?.toLowerCase().includes(q),
    );
  }

  switch (filter) {
    case "Live":
      return list.filter((r) => r.isActive);
    case "Công khai":
      return list.filter((r) => !r.isPrivate);
    case "Riêng tư":
      return list.filter((r) => r.isPrivate);
    case "Đông người":
      return list.filter((r) => (r.participants?.length ?? 0) >= 6);
    case "Chill":
      return list.filter((r) =>
        r.tags?.some((t) => ["chill", "lo-fi"].includes(t.toLowerCase())),
      );
    case "Study":
      return list.filter((r) =>
        r.tags?.some((t) => t.toLowerCase() === "study"),
      );
    case "Gaming":
      return list.filter((r) =>
        r.tags?.some((t) => ["gaming", "game"].includes(t.toLowerCase())),
      );
    default:
      return list;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface RoomCardProps {
  room: Room;
  variant?: "owner" | "joined" | "discover";
  onJoin: (room: Room) => void;
  onCopyInvite?: (room: Room) => void;
  onEdit?: (room: Room) => void;
  onDelete?: (room: Room) => void;
  onManage?: (room: Room) => void;
}

function RoomCard({
  room,
  variant = "joined",
  onJoin,
  onCopyInvite,
  onEdit,
  onDelete,
  onManage,
}: RoomCardProps) {
  const cover =
    room.playback?.currentSong?.coverArt ||
    "https://picsum.photos/id/104/400/200";
  const initial = room.host?.username?.[0]?.toUpperCase() || "M";
  const count = room.participants?.length ?? 0;

  return (
    <article className="db-room-card">
      <div
        className="db-room-cover"
        style={{ backgroundImage: `url(${cover})` }}
      >
        <div className="db-room-cover-overlay" />
        <div className="db-room-cover-badges">
          {room.isActive && (
            <span className="db-live-badge">
              <i className="db-pulse" />
              LIVE · {count}
            </span>
          )}
          {room.isPrivate && <span className="db-private-badge">🔒</span>}
        </div>
        {room.playback?.currentSong && (
          <div className="db-now-playing">
            <span className="db-np-title">
              {room.playback.currentSong.title}
            </span>
            <span className="db-np-artist">
              {room.playback.currentSong.artist}
            </span>
          </div>
        )}
      </div>

      <div className="db-room-body">
        <div className="db-room-top">
          <h3 className="db-room-name">{room.name}</h3>
          {room.description && (
            <p className="db-room-desc">{room.description}</p>
          )}
        </div>

        <div className="db-room-creator">
          <span className="db-creator-avatar">{initial}</span>
          <span className="db-creator-label">
            {variant === "discover"
              ? "🔥 Xu hướng"
              : `bởi ${room.host?.username}`}
          </span>
        </div>

        <div className="db-room-meta">
          <span>🎧 {count} nghe</span>
          <span>{room.playback?.isPlaying ? "▶ Đang phát" : "⏸ Tạm dừng"}</span>
          {variant !== "discover" && (
            <span>🎵 {room.queue?.length ?? 0} bài</span>
          )}
          {room.tags?.[0] && <span className="db-tag">#{room.tags[0]}</span>}
        </div>

        <div className="db-room-actions">
          <button
            type="button"
            className="db-join-btn"
            onClick={() => onJoin(room)}
          >
            ▶ Vào phòng
          </button>
          {variant === "owner" && (
            <>
              {room.inviteCode && (
                <button
                  type="button"
                  className="db-icon-btn"
                  aria-label="Copy mã phòng"
                  title="Copy mã phòng"
                  onClick={() => onCopyInvite?.(room)}
                >
                  🔗
                </button>
              )}

              <button
                type="button"
                className="db-icon-btn"
                aria-label="Quản lý phòng"
                title="Quản lý phòng"
                onClick={() => onManage?.(room)}
              >
                ⚙
              </button>

              <button
                type="button"
                className="db-icon-btn"
                aria-label="Chỉnh sửa"
                title="Chỉnh sửa phòng"
                onClick={() => onEdit?.(room)}
              >
                ✎
              </button>

              <button
                type="button"
                className="db-icon-btn danger"
                aria-label="Xoá"
                title="Xoá phòng"
                onClick={() => onDelete?.(room)}
              >
                🗑
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function EmptyState({
  tab,
  hasMyRoom,
  onAction,
}: {
  tab: Tab;
  hasMyRoom: boolean;
  onAction: () => void;
}) {
  const config = {
    my: {
      icon: "🎵",
      title: hasMyRoom ? "Bạn đã có phòng nhạc" : "Tạo phòng đầu tiên",
      desc: hasMyRoom
        ? "Mỗi tài khoản chỉ có một phòng. Hãy vào phòng của bạn từ phía trên."
        : "Bắt đầu một không gian nghe nhạc của riêng bạn",
      cta: hasMyRoom ? "" : "Tạo ngay",
    },
    joined: {
      icon: "🚪",
      title: "Chưa tham gia phòng nào",
      desc: "Nhập mã mời hoặc khám phá các phòng công khai để tham gia.",
      cta: "Nhập mã mời",
    },
    discover: {
      icon: "🔍",
      title: "Không có kết quả",
      desc: "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm",
      cta: "",
    },
  }[tab];

  return (
    <div className="db-empty">
      <span className="db-empty-icon">{config.icon}</span>
      <h3>{config.title}</h3>
      <p>{config.desc}</p>
      {config.cta && (
        <button type="button" className="db-btn-primary" onClick={onAction}>
          {config.cta}
        </button>
      )}
    </div>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}
function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      className="db-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="db-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="db-modal-header">
          <h3>{title}</h3>
          <button
            type="button"
            className="db-modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
        <div className="db-modal-body">{children}</div>
      </div>
    </div>
  );
}

interface TopSongsSectionProps {
  title: string;
  subtitle: string;
  songs: DashboardSong[];
  metricLabel: "plays" | "likes";
  disabled: boolean;
  isLoading: boolean;
  onAddToQueue: (song: DashboardSong) => void;
  onPlayNow: (song: DashboardSong) => void;
}

function TopSongsSection({
  title,
  subtitle,
  songs,
  metricLabel,
  disabled,
  isLoading,
  onAddToQueue,
  onPlayNow,
}: TopSongsSectionProps) {
  return (
    <section className="db-top-section">
      <div className="db-top-head">
        <div>
          <span className="db-kicker">Top songs</span>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className="db-top-pill">Top 10</span>
      </div>

      <div className="db-top-list">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="db-top-item db-top-item--skeleton"
              aria-hidden="true"
            >
              <div className="db-top-rank" />
              <div className="db-top-cover-skeleton" />
              <div className="db-top-content">
                <div className="db-skel-line w60" />
                <div className="db-skel-line w40" />
              </div>
            </div>
          ))
        ) : songs.length > 0 ? (
          songs.map((song, index) => (
            <article
              key={song._id || song.sourceId || `${title}-${index}`}
              className="db-top-item"
            >
              <span className="db-top-rank">#{index + 1}</span>
              <Image
                className="db-top-cover"
                src={song.coverArt || SONG_COVER_FALLBACK}
                alt={song.title || "Song cover"}
                width={40}
                height={40}
              />
              <div className="db-top-content">
                <strong>{song.title || "Chưa có tên bài hát"}</strong>
                <span>{song.artist || "Chưa có nghệ sĩ"}</span>
              </div>
              <span className="db-top-metric">
                {metricLabel === "plays"
                  ? `▶ ${song.playCount || 0}`
                  : `♥ ${song.likeCount || 0}`}
              </span>
              <div className="db-top-actions">
                <button
                  type="button"
                  className="db-top-btn secondary"
                  onClick={() => onAddToQueue(song)}
                  disabled={disabled}
                  aria-label="Thêm vào hàng chờ"
                  title="Thêm vào hàng chờ"
                >
                  ＋
                </button>
                <button
                  type="button"
                  className="db-top-btn primary"
                  onClick={() => onPlayNow(song)}
                  disabled={disabled}
                  aria-label="Phát ngay"
                  title="Phát ngay"
                >
                  ▶
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="db-top-empty">Chưa có dữ liệu bài hát.</div>
        )}
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, isInitialized, isAuthenticated } = useAuthStore();
  const { rooms, fetchRooms, createRoom, joinRoom } = useRoomStore();

  const [myRoom, setMyRoom] = useState<Room | null>(null);
  const [topPlayedSongs, setTopPlayedSongs] = useState<DashboardSong[]>([]);
  const [topLikedSongs, setTopLikedSongs] = useState<DashboardSong[]>([]);
  const [isLoadingTopSongs, setIsLoadingTopSongs] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("my");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<Filter>("Tất cả");

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    isPrivate: false,
    tags: "electronic",
  });
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // ── Edit room state ──
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    isPrivate: false,
    tags: "electronic",
    maxParticipants: 50,
  });
  const [editError, setEditError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // ── Delete room state ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Data loading ──
  const loadData = useCallback(async () => {
    setIsLoadingTopSongs(true);
    try {
      const [hostedRes, _roomsRes, topPlayedRes, topLikedRes] =
        await Promise.all([
          roomService.getMyHostedRoom(),
          fetchRooms({ limit: 32 }),
          songAPI.getTopPlayedSongs(10),
          songAPI.getTopLikedSongs(10),
        ]);
      setMyRoom(hostedRes.data?.data?.room ?? null);
      setTopPlayedSongs(topPlayedRes.data?.data?.songs ?? []);
      setTopLikedSongs(topLikedRes.data?.data?.songs ?? []);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      showDashboardToast(
        "Không thể tải dữ liệu dashboard. Vui lòng thử lại.",
        "error",
      );
    } finally {
      setIsLoading(false);
      setIsLoadingTopSongs(false);
    }
  }, [fetchRooms]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    loadData();
  }, [isInitialized, isAuthenticated, loadData, router]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  // ── Filtered rooms ──
  const sourceRooms = useMemo(() => {
    const baseRooms = rooms.length > 0 ? rooms : MOCK_ROOMS;

    if (!myRoom) return baseRooms;

    const exists = baseRooms.some((r) => r._id === myRoom._id);
    return exists ? baseRooms : [myRoom, ...baseRooms];
  }, [rooms, myRoom]);

  const filteredRooms = useMemo(() => {
    const roomList =
      activeTab === "my" ? (myRoom ? [myRoom] : []) : sourceRooms;

    return filterRooms(
      roomList,
      activeTab,
      searchQuery,
      selectedFilter,
      user?._id,
    );
  }, [activeTab, myRoom, sourceRooms, searchQuery, selectedFilter, user?._id]);

  // ── Stats ──
  const stats = useMemo(
    () => ({
      myRooms: myRoom ? 1 : 0,
      listeners: sourceRooms.reduce(
        (s, r) => s + (r.participants?.length ?? 0),
        0,
      ),
      hours: 156,
      likes: 342,
    }),
    [myRoom, sourceRooms],
  );

  // ── Handlers ──
  const handleJoinRoom = useCallback(
    (room: Room) => {
      router.push(`/room/${room.inviteCode || room._id}`);
    },
    [router],
  );

  const handleJoinHotRoom = useCallback(
    (roomId: string, inviteCode?: string) => {
      router.push(`/room/${inviteCode || roomId}`);
    },
    [router],
  );

  const handleCopyInviteCode = useCallback(async (room: Room) => {
    if (!room.inviteCode) {
      showDashboardToast("Phòng này chưa có mã mời.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(room.inviteCode);
      showDashboardToast(`Đã copy mã phòng: ${room.inviteCode}`);
    } catch {
      showDashboardToast("Không thể copy mã phòng.", "error");
    }
  }, []);

  const handleCreateRoom = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!createForm.name.trim()) {
        setCreateError("Tên phòng không được để trống");
        return;
      }
      setCreateError("");
      setIsCreating(true);
      try {
        const tags = createForm.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        await createRoom({
          name: createForm.name.trim(),
          description: createForm.description.trim() || undefined,
          isPrivate: createForm.isPrivate,
          tags,
        });
        const newRoom = useRoomStore.getState().currentRoom;
        setShowCreate(false);
        setCreateForm({
          name: "",
          description: "",
          isPrivate: false,
          tags: "electronic",
        });
        if (newRoom) {
          setMyRoom(newRoom);
          router.push(`/room/${newRoom.inviteCode || newRoom._id}`);
        }
      } catch (err: any) {
        setCreateError(err?.message || "Tạo phòng thất bại");
      } finally {
        setIsCreating(false);
      }
    },
    [createForm, createRoom, router],
  );

  const handleJoinByCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inviteCode.trim()) return;
      setJoinError("");
      setIsJoining(true);
      try {
        await joinRoom(inviteCode.trim().toUpperCase());
        const joined = useRoomStore.getState().currentRoom;
        setShowJoin(false);
        setInviteCode("");
        if (joined) router.push(`/room/${joined.inviteCode || joined._id}`);
      } catch (err: any) {
        setJoinError(err?.message || "Không tìm thấy phòng");
      } finally {
        setIsJoining(false);
      }
    },
    [inviteCode, joinRoom, router],
  );

  const handleOpenEditRoom = useCallback((room: Room) => {
    setEditForm({
      name: room.name || "",
      description: room.description || "",
      isPrivate: room.isPrivate || false,
      tags: room.tags?.[0] || "electronic",
      maxParticipants: room.maxParticipants || 50,
    });
    setEditError("");
    setShowEdit(true);
  }, []);

  const handleEditRoom = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!myRoom?._id) {
        showDashboardToast("Không tìm thấy phòng để sửa.", "error");
        return;
      }
      if (!editForm.name.trim()) {
        setEditError("Tên phòng không được để trống");
        return;
      }

      setEditError("");
      setIsEditing(true);
      try {
        const tags = editForm.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

        await roomService.updateRoom(myRoom._id, {
          name: editForm.name.trim(),
          description: editForm.description.trim() || undefined,
          isPrivate: editForm.isPrivate,
          tags,
          maxParticipants: Number(editForm.maxParticipants) || 50,
        });

        const updated = await roomService.getMyHostedRoom();
        setMyRoom(updated.data?.data?.room ?? null);
        setShowEdit(false);
        showDashboardToast("Đã cập nhật phòng thành công!");
      } catch (err: any) {
        setEditError(err?.response?.data?.message || err?.message || "Cập nhật phòng thất bại");
        showDashboardToast(
          err?.response?.data?.message || "Không thể cập nhật phòng.",
          "error",
        );
      } finally {
        setIsEditing(false);
      }
    },
    [editForm, myRoom?._id],
  );

  const handleOpenDeleteRoom = useCallback((_room: Room) => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteRoom = useCallback(async () => {
    if (!myRoom?._id) {
      showDashboardToast("Không tìm thấy phòng để xoá.", "error");
      return;
    }

    setIsDeleting(true);
    try {
      await roomService.deleteRoom(myRoom._id);
      setMyRoom(null);
      setShowDeleteConfirm(false);
      showDashboardToast("Đã xoá phòng thành công!");
      await loadData();
    } catch (err: any) {
      showDashboardToast(
        err?.response?.data?.message || "Không thể xoá phòng.",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  }, [loadData, myRoom?._id]);

  const handleManageRoom = useCallback(
    (room: Room) => {
      router.push(`/room/${room.inviteCode || room._id}/settings`);
    },
    [router],
  );

  const ensureSongExists = useCallback(async (song: DashboardSong) => {
    if (song._id) return song._id;
    const response = await songAPI.addSong(song);
    return response.data?.data?.song?._id;
  }, []);

  const handleAddTopSongToQueue = useCallback(
    async (song: DashboardSong) => {
      if (!myRoom?._id) {
        showDashboardToast(
          "Bạn cần có phòng nhạc trước khi thêm bài vào hàng chờ.",
          "error",
        );
        return;
      }

      try {
        const songId = await ensureSongExists(song);
        if (!songId) throw new Error("Không tìm thấy ID bài hát");
        await songAPI.addToQueue(myRoom._id, songId);
        await roomService
          .getMyHostedRoom()
          .then((res) => setMyRoom(res.data?.data?.room ?? null));
        showDashboardToast(
          `"${song.title || "bài hát"}" đã được thêm vào hàng chờ.`,
        );
      } catch (error: any) {
        showDashboardToast(
          error?.response?.data?.message ||
          error?.message ||
          "Không thể thêm bài vào hàng chờ",
          "error",
        );
      }
    },
    [ensureSongExists, myRoom?._id],
  );

  const handlePlayTopSong = useCallback(
    async (song: DashboardSong) => {
      if (!myRoom?._id) {
        showDashboardToast(
          "Bạn cần có phòng nhạc trước khi phát bài hát.",
          "error",
        );
        return;
      }

      try {
        const songId = await ensureSongExists(song);
        if (!songId) throw new Error("Không tìm thấy ID bài hát");

        await songAPI.playInRoom(myRoom._id, songId);

        showDashboardToast(
          `Đang phát "${song.title || "bài hát"}" trong phòng của bạn.`,
        );
        router.push(`/room/${myRoom.inviteCode || myRoom._id}?play=${songId}`);
      } catch (error: any) {
        showDashboardToast(
          error?.response?.data?.message ||
          error?.message ||
          "Không thể phát bài hát",
          "error",
        );
      }
    },
    [ensureSongExists, myRoom?._id, myRoom?.inviteCode, router],
  );

  // ── Guards ──
  if (!isInitialized)
    return (
      <div className="db-loading">
        <div className="db-spinner" aria-label="Đang tải" />
      </div>
    );
  if (!isAuthenticated || !user) return null;

  // ── Render ──
  return (
    <div className="db-page">
      <div className="db-body">
        <main className="db-content" aria-label="Nội dung phòng nhạc">
          {/* ── Welcome banner ── */}
          <section className="db-welcome">
            <div className="db-welcome-text">
              <span className="db-kicker">Dashboard</span>
              <h2 className="db-welcome-title">
                Xin chào, <em>{user.username}</em> 👋
              </h2>
              <p className="db-welcome-sub">
                Đây là trung tâm điều khiển nghe nhạc của bạn — xem nhanh phòng đang hoạt động,
                tiếp tục nghe, và mở ngay các hành động quan trọng.
              </p>
              <div className="db-welcome-mini">
                <div className="db-mini-chip">
                  <span>Phòng hoạt động</span>
                  <strong>{rooms.length || 0}</strong>
                </div>
                <div className="db-mini-chip">
                  <span>Trạng thái</span>
                  <strong>{myRoom ? 'Đang có phòng' : 'Chưa có phòng'}</strong>
                </div>
                <div className="db-mini-chip">
                  <span>Quick access</span>
                  <strong>Home · Explore · Profile</strong>
                </div>
              </div>
            </div>

            <div className="db-welcome-actions">
              {myRoom ? (
                <button
                  type="button"
                  className="db-btn-primary"
                  onClick={() =>
                    router.push(`/room/${myRoom.inviteCode || myRoom._id}`)
                  }
                >
                  ▶ Vào phòng của tôi
                </button>
              ) : (
                <button
                  type="button"
                  className="db-btn-primary"
                  onClick={() => setShowCreate(true)}
                >
                  ＋ Tạo phòng mới
                </button>
              )}
              <button
                type="button"
                className="db-btn-secondary"
                onClick={() => setShowJoin(true)}
              >
                🔑 Nhập mã mời
              </button>
              <button
                type="button"
                className="db-btn-ghost"
                onClick={() => router.push('/explore')}
              >
                ⌖ Khám phá phòng
              </button>
            </div>
          </section>

          <UserProfileCard />

          {/* ── Stats ── */}
          <div className="db-stats">
            {[
              {
                icon: "🎵",
                value: stats.myRooms,
                label: "Phòng của tôi",
                accent: "amber",
                sub: "Không gian cá nhân",
              },
              {
                icon: "👥",
                value: stats.listeners,
                label: "Thành viên tham gia",
                accent: "blue",
                sub: "Tổng cộng trong hệ thống",
              },
              {
                icon: "⏱",
                value: `${stats.hours}h`,
                label: "Giờ nghe nhạc",
                accent: "purple",
                sub: "Tổng thời gian hoạt động",
              },
              {
                icon: "♥",
                value: stats.likes,
                label: "Lượt yêu thích",
                accent: "rose",
                sub: "Bài hát đã tương tác",
              },
            ].map(({ icon, value, label, accent, sub }) => (
              <article key={label} className={`db-stat db-stat--${accent}`}>
                <span className="db-stat-icon">{icon}</span>
                <div>
                  <strong className="db-stat-value">{value}</strong>
                  <span className="db-stat-label">{label}</span>
                  <span className="db-stat-sub">{sub}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="db-split-grid">
            <HotRoomsSection onJoin={handleJoinHotRoom} />
            <RecentlyPlayedSection
              onPlay={handlePlayTopSong}
              onAddToQueue={handleAddTopSongToQueue}
            />
          </div>

          <LikedSongsSection
            onPlay={handlePlayTopSong}
            onAddToQueue={handleAddTopSongToQueue}
          />

          {/* ── Controls: tabs + search + filters ── */}
          <div className="db-controls">
            <div className="db-controls-top">
              <nav className="db-tabs" aria-label="Điều hướng phòng">
                {TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    className={`db-tab${activeTab === id ? " active" : ""}`}
                    onClick={() => setActiveTab(id)}
                    aria-current={activeTab === id ? "page" : undefined}
                  >
                    {label}
                    {activeTab === id && (
                      <span className="db-tab-count">{filteredRooms.length}</span>
                    )}
                  </button>
                ))}
              </nav>

              <div className="db-search-row">
                <div className="db-search">
                  <span className="db-search-icon">🔎</span>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên phòng, host, mã mời..."
                    aria-label="Tìm kiếm phòng"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="db-search-clear"
                      onClick={() => setSearchQuery("")}
                      aria-label="Xoá"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className={`db-refresh-btn${isRefreshing ? " spinning" : ""}`}
                  onClick={handleRefresh}
                  aria-label="Làm mới"
                >
                  ↻
                </button>
              </div>
            </div>

            <div className="db-filters" role="group" aria-label="Bộ lọc">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`db-filter-chip${selectedFilter === f ? " active" : ""}`}
                  onClick={() => setSelectedFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* ── Room grid ── */}
          <div className="db-room-grid">
            {isLoading ? (
              Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="db-room-skeleton" aria-hidden="true">
                  <div className="db-skel-cover" />
                  <div className="db-skel-body">
                    <div className="db-skel-line w60" />
                    <div className="db-skel-line w40" />
                    <div className="db-skel-line w80" />
                  </div>
                </div>
              ))
            ) : filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <RoomCard
                  key={room._id}
                  room={room}
                  variant={
                    activeTab === "my"
                      ? "owner"
                      : activeTab === "discover"
                        ? "discover"
                        : "joined"
                  }
                  onJoin={handleJoinRoom}
                  onCopyInvite={handleCopyInviteCode}
                  onEdit={handleOpenEditRoom}
                  onDelete={handleOpenDeleteRoom}
                  onManage={handleManageRoom}
                />
              ))
            ) : (
              <EmptyState
                tab={activeTab}
                hasMyRoom={Boolean(myRoom)}
                onAction={
                  activeTab === "joined"
                    ? () => setShowJoin(true)
                    : activeTab === "my"
                      ? () => setShowCreate(true)
                      : () => setSearchQuery("")
                }
              />
            )}
          </div>
        </main>

        <aside className="db-sidebar db-top-sidebar" aria-label="Top bài hát">
          <div className="db-sidebar-block">
            <TopSongsSection
              title="Top 10 bài nghe nhiều nhất"
              subtitle="Những bài đang được phát nhiều nhất trong hệ thống."
              songs={topPlayedSongs}
              metricLabel="plays"
              disabled={!myRoom}
              isLoading={isLoadingTopSongs}
              onAddToQueue={handleAddTopSongToQueue}
              onPlayNow={handlePlayTopSong}
            />
          </div>

          <div className="db-sidebar-block">
            <TopSongsSection
              title="Top 10 bài like nhiều nhất"
              subtitle="Những bài được cộng đồng yêu thích nhất."
              songs={topLikedSongs}
              metricLabel="likes"
              disabled={!myRoom}
              isLoading={isLoadingTopSongs}
              onAddToQueue={handleAddTopSongToQueue}
              onPlayNow={handlePlayTopSong}
            />
          </div>

          {!myRoom && (
            <p className="db-top-hint">
              Bạn cần có phòng nhạc để dùng nút thêm vào chờ hoặc phát ngay.
            </p>
          )}
        </aside>
      </div>

      {/* ── Create room modal ── */}
      {showCreate && !myRoom && (
        <Modal title="Tạo phòng mới" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreateRoom}>
            <div className="db-field">
              <label htmlFor="room-name">Tên phòng</label>
              <input
                id="room-name"
                type="text"
                placeholder="VD: Chill Sunday"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                required
                autoFocus
              />
            </div>
            <div className="db-field">
              <label htmlFor="room-desc">
                Mô tả <span className="db-optional">(tùy chọn)</span>
              </label>
              <textarea
                id="room-desc"
                placeholder="Mô tả không gian âm nhạc của bạn..."
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm({ ...createForm, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="db-field-row">
              <div className="db-field">
                <label htmlFor="room-privacy">Chế độ</label>
                <select
                  id="room-privacy"
                  value={createForm.isPrivate ? "true" : "false"}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      isPrivate: e.target.value === "true",
                    })
                  }
                >
                  <option value="false">🌐 Công khai</option>
                  <option value="true">🔒 Riêng tư</option>
                </select>
              </div>
              <div className="db-field">
                <label htmlFor="room-genre">Thể loại</label>
                <select
                  id="room-genre"
                  value={createForm.tags}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, tags: e.target.value })
                  }
                >
                  {GENRE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {createError && <p className="db-field-error">⚠ {createError}</p>}
            <div className="db-modal-actions">
              <button
                type="button"
                className="db-btn-ghost"
                onClick={() => setShowCreate(false)}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="db-btn-primary"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <span className="db-btn-spinner" />
                    Đang tạo...
                  </>
                ) : (
                  "＋ Tạo phòng"
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Join room modal ── */}
      {showJoin && (
        <Modal title="Tham gia phòng" onClose={() => setShowJoin(false)}>
          <form onSubmit={handleJoinByCode}>
            <div className="db-field">
              <label htmlFor="invite-code">Mã phòng</label>
              <input
                id="invite-code"
                type="text"
                placeholder="NHẬP MÃ PHÒNG"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="db-code-input"
                required
                autoFocus
                maxLength={12}
              />
            </div>
            {joinError && <p className="db-field-error">⚠ {joinError}</p>}
            <div className="db-modal-actions">
              <button
                type="button"
                className="db-btn-ghost"
                onClick={() => setShowJoin(false)}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="db-btn-primary"
                disabled={isJoining || !inviteCode.trim()}
              >
                {isJoining ? (
                  <>
                    <span className="db-btn-spinner" />
                    Đang tham gia...
                  </>
                ) : (
                  "🚪 Tham gia"
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {/* ── Edit room modal ── */}
      {showEdit && (
        <Modal title="Chỉnh sửa phòng" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleEditRoom}>
            <div className="db-field">
              <label htmlFor="edit-name">Tên phòng</label>
              <input
                id="edit-name"
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="db-field">
              <label htmlFor="edit-desc">Mô tả</label>
              <textarea
                id="edit-desc"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="db-field-row">
              <div className="db-field">
                <label htmlFor="edit-privacy">Chế độ</label>
                <select
                  id="edit-privacy"
                  value={editForm.isPrivate ? "true" : "false"}
                  onChange={(e) => setEditForm({ ...editForm, isPrivate: e.target.value === "true" })}
                >
                  <option value="false">🌐 Công khai</option>
                  <option value="true">🔒 Riêng tư</option>
                </select>
              </div>
              <div className="db-field">
                <label htmlFor="edit-genre">Thể loại</label>
                <select
                  id="edit-genre"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                >
                  {GENRE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="db-field">
              <label htmlFor="edit-max">Số lượng người nghe tối đa</label>
              <input
                id="edit-max"
                type="number"
                min={2}
                max={100}
                value={editForm.maxParticipants}
                onChange={(e) => setEditForm({ ...editForm, maxParticipants: parseInt(e.target.value, 10) || 50 })}
              />
            </div>
            {editError && <p className="db-field-error">⚠ {editError}</p>}
            <div className="db-modal-actions">
              <button type="button" className="db-btn-ghost" onClick={() => setShowEdit(false)}>
                Hủy
              </button>
              <button type="submit" className="db-btn-primary" disabled={isEditing}>
                {isEditing ? (
                  <>
                    <span className="db-btn-spinner" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete room confirm modal ── */}
      {showDeleteConfirm && (
        <Modal title="Xoá phòng" onClose={() => setShowDeleteConfirm(false)}>
          <div className="db-delete-confirm">
            <p>Bạn chắc chắn muốn xoá phòng này?</p>
            <p className="db-delete-note">
              Hành động này sẽ xoá phòng vĩnh viễn và không thể khôi phục.
            </p>
          </div>
          <div className="db-modal-actions">
            <button type="button" className="db-btn-ghost" onClick={() => setShowDeleteConfirm(false)}>
              Hủy
            </button>
            <button type="button" className="db-btn-primary" onClick={handleDeleteRoom} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <span className="db-btn-spinner" />
                  Đang xoá...
                </>
              ) : (
                "Xoá phòng"
              )}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
