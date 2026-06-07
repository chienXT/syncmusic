'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, User, AtSign, FileText, Camera } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import { authAPI } from '@/lib/api';
import '../profile.css';

export default function EditProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || '');
      setIsLoading(false);
    }
  }, [user]);

  const handleSave = async () => {
    if (!username.trim()) {
      addToast('Tên người dùng không được để trống', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await authAPI.updateProfile({
        username: username.trim(),
        bio: bio.trim(),
        avatar: avatar.trim() || undefined,
      });
      const updatedUser = res.data?.data?.user || res.data?.data || null;
      if (updatedUser) {
        setUser(updatedUser);
      }
      addToast('Đã lưu hồ sơ thành công', 'success');
      if (updatedUser?._id) {
        router.replace(`/profile/${updatedUser._id}`);
      }
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Không thể lưu hồ sơ', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-shell">
        <LoadingSpinner size="lg" />
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
              <p className="profile-kicker">Chỉnh sửa hồ sơ</p>
              <h1 className="profile-title">Profile settings</h1>
              <p className="profile-subtitle">
                Cập nhật thông tin cá nhân, ảnh đại diện và giới thiệu để profile của bạn thật sự nổi bật.
              </p>
            </div>
            <div className="profile-hero-actions">
              <Button variant="ghost" size="sm" onClick={() => user?._id && router.push(`/profile/${user._id}`)}>
                <ArrowLeft size={16} className="mr-2" /> Hủy
              </Button>
            </div>
          </div>

          <div className="profile-hero-card">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar-ring" />
              <div className="profile-avatar">
                {avatar ? (
                  <img src={avatar} alt={username} />
                ) : (
                  <span>{(username || '?').charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            <div className="profile-identity">
              <div className="profile-meta-row">
                <span><User size={14} /> Xem trước avatar</span>
                <span><AtSign size={14} /> @{username || 'username'}</span>
              </div>
              <p className="profile-bio">
                {bio || 'Chưa có giới thiệu.'}
              </p>
            </div>
          </div>
        </motion.section>

        <div className="profile-main" style={{ gridArea: 'main' }}>
          <Card variant="glass" className="profile-card">
            <div className="profile-card-head">
              <div>
                <p className="profile-card-kicker">Thông tin cơ bản</p>
                <h2>Username & Bio</h2>
              </div>
              <AtSign size={18} />
            </div>

            <div className="profile-edit-field">
              <label htmlFor="edit-username">
                <AtSign size={14} /> Tên người dùng
              </label>
              <input
                id="edit-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên người dùng"
                maxLength={30}
              />
            </div>

            <div className="profile-edit-field">
              <label htmlFor="edit-bio">
                <FileText size={14} /> Giới thiệu
              </label>
              <textarea
                id="edit-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Viết vài dòng giới thiệu về bạn..."
                rows={4}
                maxLength={200}
              />
              <span className="profile-edit-hint">{bio.length}/200 ký tự</span>
            </div>
          </Card>

          <Card variant="glass" className="profile-card">
            <div className="profile-card-head">
              <div>
                <p className="profile-card-kicker">Ảnh đại diện</p>
                <h2>Avatar URL</h2>
              </div>
              <Camera size={18} />
            </div>

            <div className="profile-edit-field">
              <label htmlFor="edit-avatar">
                <Camera size={14} /> Đường dẫn ảnh
              </label>
              <input
                id="edit-avatar"
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
              <span className="profile-edit-hint">Dùng URL ảnh công khai. Để trống nếu muốn dùng avatar mặc định.</span>
            </div>
          </Card>
        </div>

        <div className="profile-side" style={{ gridArea: 'side', position: 'sticky', top: 78 }}>
          <Card variant="glass" className="profile-card">
            <div className="profile-card-head">
              <div>
                <p className="profile-card-kicker">Hành động</p>
                <h2>Lưu thay đổi</h2>
              </div>
              <Save size={18} />
            </div>
            <p className="profile-card-desc">
              Sau khi lưu, profile sẽ được cập nhật ngay lập tức và bạn sẽ được chuyển về trang hồ sơ.
            </p>
            <div className="profile-card-actions">
              <Button onClick={handleSave} disabled={isSaving || !username.trim()}>
                <Save size={16} className="mr-2" /> {isSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}
              </Button>
              <Button variant="secondary" onClick={() => user?._id && router.push(`/profile/${user._id}`)}>
                Hủy bỏ
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
