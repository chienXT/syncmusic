import Link from 'next/link';

export default function HistoryPage() {
  return (
    <main className="route-page-shell">
      <section className="route-hero-card">
        <span className="route-kicker">History</span>
        <h1>Lịch sử nghe</h1>
        <p>Xem lại các bài hát và phòng nhạc bạn đã tham gia gần đây.</p>
        <div className="route-action-row">
          <Link className="route-primary-btn" href="/home">Về Home</Link>
        </div>
      </section>

      <div className="route-empty-placeholder">
        <p>Lịch sử nghe sẽ được đồng bộ khi bạn phát nhạc trong phòng.</p>
      </div>
    </main>
  );
}
