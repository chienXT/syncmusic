'use client';

import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BadgeInfo,
  Clock3,
  Edit3,
  Heart,
  Music2,
  PlayCircle,
  Radio,
  Sparkles,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ProfileMiniSongRow, ProfileStatCard } from '@/features/profile/components';
import { useProfilePage } from '@/features/profile/hooks/useProfilePage';
import '../profile.css';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const {
    profileUser,
    recentSongs,
    isLoading,
    memberSince,
    canJoinRoom,
    roomIdentifier,
    isOwnProfile,
    totalFriends,
    totalLiked,
    totalRecent,
  } = useProfilePage(userId);

  if (isLoading) {
    return (
      <div className="profile-shell">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="profile-shell profile-shell--empty">
        <Card variant="glass" className="profile-empty-card">
          <BadgeInfo size={28} />
          <h1>Không tìm thấy hồ sơ</h1>
          <p>Người dùng này không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
          <Button onClick={() => router.push('/home')}>
            <ArrowLeft size={16} className="mr-2" /> Về Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="profile-shell">
      <div className="profile-bg" />
      <div className="profile-grid">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="profile-hero"
        >
          <div className="profile-hero-top">
            <div>
              <p className="profile-kicker">Hồ sơ người dùng</p>
              <h1 className="profile-title">{profileUser.username}</h1>
              <p className="profile-subtitle">
                {isOwnProfile
                  ? 'Đây là không gian cá nhân của bạn — một profile đẹp, gọn và đủ sức tạo ấn tượng ngay từ cái nhìn đầu tiên.'
                  : 'Một profile cao cấp với các thông tin, hoạt động nghe nhạc và phòng hiện tại của người dùng.'}
              </p>
            </div>
            <div className="profile-hero-actions">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft size={16} className="mr-2" /> Quay lại
              </Button>
              {isOwnProfile && (
                <Button variant="secondary" size="sm" onClick={() => router.push('/profile/edit')}>
                  <Edit3 size={16} className="mr-2" /> Chỉnh sửa
                </Button>
              )}
            </div>
          </div>

          <div className="profile-hero-card">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar-ring" />
              <div className="profile-avatar">
                {profileUser.avatar ? (
                  <img src={profileUser.avatar} alt={profileUser.username} />
                ) : (
                  <span>{profileUser.username.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className={`profile-status-dot ${profileUser.status === 'offline' ? 'offline' : 'online'}`} />
            </div>

            <div className="profile-identity">
              <div className="profile-status-pill">
                {profileUser.status === 'offline' ? <WifiOff size={12} /> : <Wifi size={12} />}
                {profileUser.status || 'offline'}
              </div>
              <div className="profile-meta-row">
                <span><User size={14} /> @{profileUser.username}</span>
                <span><Clock3 size={14} /> Thành viên từ {memberSince}</span>
                <span><Sparkles size={14} /> Nhạc là phong cách</span>
              </div>
              <p className="profile-bio">
                {profileUser.bio?.trim() ? profileUser.bio : 'Người dùng này chưa thêm giới thiệu.'}
              </p>
            </div>
          </div>

          <div className="profile-stat-grid">
            <ProfileStatCard icon={<Music2 size={18} />} label="Bài đã thích" value={totalLiked} accent="rose" />
            <ProfileStatCard icon={<PlayCircle size={18} />} label="Bài gần đây" value={totalRecent} accent="amber" />
            <ProfileStatCard icon={<Radio size={18} />} label="Bạn bè" value={totalFriends} accent="purple" />
            <ProfileStatCard icon={<Heart size={18} />} label="Trạng thái" value={profileUser.status || 'offline'} accent="blue" />
          </div>
        </motion.section>

        <div className="profile-side">
          <Card variant="glass" className="profile-card profile-room-card">
            <div className="profile-card-head">
              <div>
                <p className="profile-card-kicker">Phòng hiện tại</p>
                <h2>{canJoinRoom ? profileUser.currentRoom?.name : 'Chưa tham gia phòng nào'}</h2>
              </div>
              <Music2 size={18} />
            </div>

            <p className="profile-card-desc">
              {canJoinRoom
                ? `Mã phòng: ${profileUser.currentRoom?.inviteCode || profileUser.currentRoom?._id}`
                : 'Người này hiện chưa ở trong phòng nhạc hoạt động nào.'}
            </p>

            <div className="profile-card-actions">
              <Button onClick={() => canJoinRoom && roomIdentifier && router.push(`/room/${roomIdentifier}`)} disabled={!canJoinRoom}>
                <PlayCircle size={16} className="mr-2" /> Vào phòng
              </Button>
              <Button variant="secondary" onClick={() => router.push('/home')}>
                Về Home
              </Button>
            </div>
          </Card>

          <Card variant="glass" className="profile-card">
            <div className="profile-card-head">
              <div>
                <p className="profile-card-kicker">Tổng quan nghe nhạc</p>
                <h2>Năng lượng hoạt động</h2>
              </div>
              <Sparkles size={18} />
            </div>
            <div className="profile-mini-list">
              <div className="profile-mini-item">
                <span>Trạng thái</span>
                <strong>{profileUser.status || 'offline'}</strong>
              </div>
              <div className="profile-mini-item">
                <span>Lượt kết nối</span>
                <strong>{totalFriends}</strong>
              </div>
              <div className="profile-mini-item">
                <span>Giới thiệu</span>
                <strong>{profileUser.bio?.trim() ? 'Có' : 'Chưa có'}</strong>
              </div>
            </div>
          </Card>
        </div>

        <div className="profile-main">
          <Card variant="glass" className="profile-card">
            <div className="profile-card-head">
              <div>
                <p className="profile-card-kicker">Nghe gần đây</p>
                <h2>Recent activity</h2>
              </div>
            </div>
            <div className="profile-song-list">
              {recentSongs.length > 0 ? (
                recentSongs.slice(0, 5).map((song) => <ProfileMiniSongRow key={song._id} song={song} />)
              ) : (
                <div className="profile-empty-line">Chưa có bài hát nào trong lịch sử nghe gần đây.</div>
              )}
            </div>
          </Card>

          <Card variant="glass" className="profile-card">
            <div className="profile-card-head">
              <div>
                <p className="profile-card-kicker">Phong cách</p>
                <h2>Dấu ấn cá nhân</h2>
              </div>
            </div>
            <div className="profile-spotlight-grid">
              <div className="profile-spotlight">
                <span>Username</span>
                <strong>@{profileUser.username}</strong>
              </div>
              <div className="profile-spotlight">
                <span>Member since</span>
                <strong>{memberSince}</strong>
              </div>
              <div className="profile-spotlight">
                <span>Profile state</span>
                <strong>{isOwnProfile ? 'Của bạn' : 'Người dùng khác'}</strong>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}