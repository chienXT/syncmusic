import Link from 'next/link';
import type { Metadata } from 'next';
import { Headphones, MessageCircle, Radio, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'SyncMusic Live — Nghe nhạc cùng nhau',
  description: 'Tạo phòng nghe nhạc live, đồng bộ player realtime, chat và quản lý hàng chờ bài hát.',
};

const highlights = [
  { icon: Radio, title: 'Phòng nhạc live', desc: 'Tạo phòng public/private, mời bạn bè bằng mã phòng và nghe cùng nhau.' },
  { icon: Headphones, title: 'Player đồng bộ', desc: 'Host điều khiển phát, dừng, next bài; người nghe tự đồng bộ thời gian.' },
  { icon: MessageCircle, title: 'Chat realtime', desc: 'Trò chuyện, gửi thông báo hệ thống và khóa chat khi cần quản lý phòng.' },
  { icon: Users, title: 'Vai trò rõ ràng', desc: 'Host, moderator và member có quyền riêng để phòng hoạt động ổn định.' },
];

export default function LandingPage() {
  return (
    <main className="landing-page" id="main-content">
      <section className="landing-hero">
        <span className="landing-kicker">SyncMusic Live</span>
        <h1>Nghe nhạc live theo phòng, chat cùng bạn bè.</h1>
        <p>
          Nền tảng nghe nhạc realtime với hàng chờ bài hát, tìm nhạc YouTube,
          đồng bộ player và giao diện tối ưu cho PC lẫn mobile.
        </p>
        <div className="landing-hero-actions">
          <Link className="landing-btn landing-btn-primary" href="/home">Vào Home</Link>
          <Link className="landing-btn landing-btn-secondary" href="/explore">Khám phá phòng</Link>
        </div>
      </section>

      <section className="landing-grid" aria-label="Tính năng chính">
        {highlights.map(({ icon: Icon, title, desc }) => (
          <article className="landing-card" key={title}>
            <span className="landing-card-icon"><Icon size={22} /></span>
            <h2>{title}</h2>
            <p>{desc}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
