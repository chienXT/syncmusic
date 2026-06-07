'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { userAPI } from '@/lib/api';
import styles from './settings.module.css';

const themes = [
  { id: 'dark', label: 'Tối (Dark)', color: 'var(--bg-800)' },
  { id: 'light', label: 'Sáng (Light)', color: '#f5f5f7' }
];

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [theme, setTheme] = useState(user?.preferences?.theme || 'dark');
  const [notifications, setNotifications] = useState(user?.preferences?.notifications ?? true);
  const [autoPlay, setAutoPlay] = useState(user?.preferences?.autoPlay ?? true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Profile Update Handler
  const handleProfileUpdate = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { data } = await userAPI.updateProfile({ username, bio });
      if (data?.data?.user) setUser(data.data.user);
      setMessage('Cập nhật hồ sơ thành công!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setLoading(false);
    }
  };

  // Preference Update Handler
  const handlePreferenceUpdate = async (field: string, value: any) => {
    setError('');
    setMessage('');

    const updatedPreferences = {
      theme,
      notifications,
      autoPlay,
      [field]: value
    };

    try {
      const { data } = await userAPI.updatePreferences(updatedPreferences);
      if (data?.data?.preferences) {
        setUser({ ...user, preferences: updatedPreferences });
      }
      setMessage('Đã lưu cài đặt!');
    } catch (err: any) {
      setError('Không thể lưu cài đặt nào.');
    }
  };

  return (
    <main className={styles.settingsPage}>
      <header className={styles.heroSection}>
        <div className="route-kicker">Settings</div>
        <h1>Cài đặt</h1>
        <p>Quản lý trải nghiệm, bảo mật và tùy chọn phát nhạc của bạn.</p>
      </header>

      <div className={styles.layoutGrid}>
        <div className={styles.sidebar}>
          <div className={styles.profileCard}>
            <div className={styles.avatarPreview}>{username?.charAt(0).toUpperCase()}</div>
            <h2>{username}</h2>
            <span className={styles.roleBadge}>Premium Member</span>
          </div>
          <nav className={styles.navList}>
            <button onClick={() => {}} className={styles.navButtonActive}>Tài khoản</button>
            <button onClick={() => {}} className={styles.navButton}>Thông báo</button>
            <button onClick={() => {}} className={styles.navButton}>Giao diện</button>
          </nav>
        </div>

        <div className={styles.contentArea}>
          {message && <div className={styles.toastSuccess}>{message}</div>}
          {error && <div className={styles.toastError}>{error}</div>}

          <section className="glass-card">
            <h3>Thông tin tài khoản</h3>
            <p className="glass-desc">Cập nhật hồ sơ cá nhân của bạn.</p>

            <div className={styles.formGroup}>
              <label>Tên hiển thị</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên"
                className={styles.inputField}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Tiểu sử (Bio)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Việc đọc sách giúp bạn phát triển..."
                rows={3}
                className={styles.textareaField}
              />
            </div>

            <button onClick={handleProfileUpdate} disabled={loading} className="button-primary">
              {loading ? 'Đang lưu...' : 'Lưu hồ sơ'}
            </button>
          </section>

          <section className="glass-card">
            <h3>Tùy chọn giao diện</h3>
            <p className="glass-desc">Chủ đề sẽ được áp dụng trên toàn hệ thống.</p>

            <div className={styles.themeGrid}>
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); handlePreferenceUpdate('theme', t.id); }}
                  className={`${styles.themeOption} ${theme === t.id ? styles.themeActive : ''}`}
                >
                  <span
                    className={styles.colorPreview}
                    style={{ background: t.color, border: t.id === 'light' ? '1px solid rgba(255,255,255,0.3)' : 'none' }}
                  ></span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="glass-card">
            <h3>Hành vi & Trải nghiệm</h3>
            <p className="glass-desc">Tùy chỉnh cách phần mềm tương tác với bạn.</p>

            <div className="flex-column gap-12">
              <label className="flex-between">
                <div>
                  <strong>Thông báo đẩy</strong>
                  <span>Nhận thông báo từ bạn bè và nhóm.</span>
                </div>
                <div
                  className={`toggle ${notifications ? 'active' : ''}`}
                  onClick={() => { setNotifications(!notifications); handlePreferenceUpdate('notifications', !notifications); }}
                >
                  <div className="toggle-knob" />
                </div>
              </label>

              <label className="flex-between">
                <div>
                  <strong>Tự động phát</strong>
                  <span>Tự động phát bài tiếp theo.</span>
                </div>
                <div
                  className={`toggle ${autoPlay ? 'active' : ''}`}
                  onClick={() => { setAutoPlay(!autoPlay); handlePreferenceUpdate('autoPlay', !autoPlay); }}
                >
                  <div className="toggle-knob" />
                </div>
              </label>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
