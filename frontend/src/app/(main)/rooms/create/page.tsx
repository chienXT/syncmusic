import Link from 'next/link';

const quickActions = [
  { href: '/explore', label: 'Khám phá phòng', desc: 'Tìm phòng nghe nhạc đang hoạt động.' },
  { href: '/rooms/create', label: 'Tạo phòng mới', desc: 'Bắt đầu một phiên nghe live.' },
  { href: '/search', label: 'Tìm bài hát', desc: 'Tìm nhanh bài hát để thêm vào hàng đợi.' },
];

export default function CreateRoomPage() {
  return (
    <main className="route-page-shell">
      <section className="route-hero-card">
        <span className="route-kicker">Rooms</span>
        <h1>Tạo phòng nghe nhạc</h1>
        <p>Thiết lập phòng live, mời bạn bè và đồng bộ trải nghiệm nghe nhạc trong thời gian thực.</p>
        <div className="route-action-row">
          <Link className="route-primary-btn" href="/home">Tạo từ Home</Link>
          <Link className="route-secondary-btn" href="/explore">Xem phòng đang mở</Link>
        </div>
      </section>

      <section className="route-grid-list">
        {quickActions.map((item) => (
          <Link key={item.href} className="route-info-card" href={item.href}>
            <strong>{item.label}</strong>
            <span>{item.desc}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
