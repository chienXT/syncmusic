'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, Headphones, Mail, Lock, CheckCircle2 } from 'lucide-react';
import styles from '../auth-shared.module.css';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuthStore();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState(
    searchParams.get('reason') === 'another_session'
      ? 'Tài khoản của bạn đã đăng nhập ở thiết bị khác. Vui lòng đăng nhập lại nếu đó là bạn.'
      : ''
  );
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      await login(formData.username, formData.password);
      router.push('/home');
    } catch (err: any) {
      setError(err?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    }
  };

  const handleGoogleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setError('Không thể đăng nhập bằng Google lúc này');
      return;
    }
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <div id="login-page" className={styles.authPage}>
      <div className={styles.authContainer}>
        <section className={styles.authBrand} aria-label="Giới thiệu SyncMusic">
          <div className={styles.brandContent}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}>
                <Headphones size={18} />
              </div>
              <span className={styles.logoText}>Aether Rooms</span>
            </div>

            <h1>Chào mừng trở lại</h1>
            <p>
              Đăng nhập để tiếp tục hành trình
              <br />
              khám phá âm nhạc đẳng cấp
            </p>

            <div className={styles.brandFeatures}>
              <div className={styles.feature}>
                <CheckCircle2 size={15} /> Lossless 24bit/192kHz
              </div>
              <div className={styles.feature}>
                <CheckCircle2 size={15} /> Phòng nghe nhạc sống động
              </div>
              <div className={styles.feature}>
                <CheckCircle2 size={15} /> Kết nối bạn bè mọi lúc
              </div>
            </div>
          </div>
          <div className={styles.brandBg} />
        </section>

        <section id="login-form-section" className={styles.authForm} aria-labelledby="login-form-title">
          <div className={styles.formWrapper}>
            <div className={styles.formHeader}>
              <h2 id="login-form-title">Đăng nhập</h2>
              <p>Nhập thông tin tài khoản của bạn</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label>Email hoặc tên đăng nhập</label>
                <div className={styles.inputIcon}>
                  <Mail size={16} className={styles.inputLeadIcon} />
                  <input
                    id="login-identity-input"
                    type="text"
                    placeholder="example@email.com hoặc username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Mật khẩu</label>
                <div className={styles.inputIcon}>
                  <Lock size={16} className={styles.inputLeadIcon} />
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    id="login-password-toggle"
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label="Ẩn/hiện mật khẩu"
                  >
                    {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>

              {error && <div className={styles.authError}>{error}</div>}

              <div className={styles.formOptions}>
                <label className={styles.checkbox} htmlFor="login-remember-checkbox">
                  <input id="login-remember-checkbox" type="checkbox" />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <button id="login-forgot-password" type="button" className={styles.forgotLink}>
                  Quên mật khẩu?
                </button>
              </div>

              <button id="login-submit-button" type="submit" className={styles.btnLogin} disabled={isLoading}>
                {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>

              <div className={styles.divider}>
                <span>Hoặc tiếp tục với</span>
              </div>

              <div className={styles.socialLogin}>
                <button id="login-google-button" type="button" className={styles.socialBtn} onClick={handleGoogleLogin}>
                  Google
                </button>
              </div>

              <div className={styles.authFooter}>
                Chưa có tài khoản? <Link href="/register">Đăng ký ngay</Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}