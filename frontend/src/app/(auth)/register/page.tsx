'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, Headphones, User, Mail, Lock, CheckCircle2 } from 'lucide-react';
import styles from '../auth-shared.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu không khớp');
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    try {
      await register(formData.username, formData.email, formData.password);
      router.push('/home');
    } catch (err: any) {
      setError(err?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  const handleGoogleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setError('Không thể đăng ký bằng Google lúc này');
      return;
    }
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <div id="register-page" className={styles.authPage}>
      <div className={styles.authContainer}>
        <section className={styles.authBrand} aria-label="Giới thiệu trải nghiệm đăng ký">
          <div className={styles.brandContent}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}>
                <Headphones size={18} />
              </div>
              <span className={styles.logoText}>Aether Rooms</span>
            </div>

            <h1>Bắt đầu cùng Aether</h1>
            <p>
              Tạo tài khoản để khám phá
              <br />
              không gian âm nhạc đồng bộ
            </p>

            <div className={styles.brandFeatures}>
              <div className={styles.feature}>
                <CheckCircle2 size={15} /> Miễn phí tạo phòng nghe nhạc
              </div>
              <div className={styles.feature}>
                <CheckCircle2 size={15} /> Đồng bộ real-time với bạn bè
              </div>
              <div className={styles.feature}>
                <CheckCircle2 size={15} /> Chất lượng âm thanh cao cấp
              </div>
            </div>
          </div>
          <div className={styles.brandBg} />
        </section>

        <section id="register-form-section" className={styles.authForm} aria-labelledby="register-form-title">
          <div className={styles.formWrapper}>
            <div className={styles.formHeader}>
              <h2 id="register-form-title">Đăng ký</h2>
              <p>Tạo tài khoản trong vài bước</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label>Tên đăng nhập</label>
                <div className={styles.inputIcon}>
                  <User size={16} className={styles.inputLeadIcon} />
                  <input
                    id="register-username-input"
                    type="text"
                    placeholder="nguoidung123"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Email</label>
                <div className={styles.inputIcon}>
                  <Mail size={16} className={styles.inputLeadIcon} />
                  <input
                    id="register-email-input"
                    type="email"
                    placeholder="ban@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Mật khẩu</label>
                <div className={styles.inputIcon}>
                  <Lock size={16} className={styles.inputLeadIcon} />
                  <input
                    id="register-password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ít nhất 6 ký tự"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    id="register-password-toggle"
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label="Ẩn/hiện mật khẩu"
                  >
                    {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Xác nhận mật khẩu</label>
                <div className={styles.inputIcon}>
                  <Lock size={16} className={styles.inputLeadIcon} />
                  <input
                    id="register-confirm-password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    id="register-confirm-password-toggle"
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label="Ẩn/hiện xác nhận mật khẩu"
                  >
                    {showConfirmPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>

              {error && <div className={styles.authError}>{error}</div>}

              <button id="register-submit-button" type="submit" className={styles.btnLogin} disabled={isLoading}>
                {isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
              </button>

              <div className={styles.divider}>
                <span>Hoặc tiếp tục với</span>
              </div>

              <div className={styles.socialLogin}>
                <button id="register-google-button" type="button" className={styles.socialBtn} onClick={handleGoogleLogin}>
                  Google
                </button>
              </div>

              <div className={styles.authFooter}>
                Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}