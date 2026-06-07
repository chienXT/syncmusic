import Link from 'next/link';

export default function MyRoomIndexPage() {
  return (
    <main className="rp-index-page">
      <section className="rp-index-card">
        <span className="ep-kicker">Phòng của tôi</span>
        <h1 className="ep-hero-title">Chưa chọn phòng nhạc</h1>
        <p className="ep-hero-desc">
          Bạn có thể quay về Dashboard để tạo phòng riêng, vào phòng đang host,
          hoặc mở Explore để tham gia phòng public đang live.
        </p>
        <div className="ep-hero-actions">
          <Link href="/home" className="ep-btn-primary">Về Home</Link>
          <Link href="/explore" className="ep-btn-secondary">Khám phá phòng</Link>
        </div>
      </section>
    </main>
  );
}
