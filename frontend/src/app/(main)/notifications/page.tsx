const notifications = [
  'Phòng mới đã sẵn sàng để tham gia.',
  'Playlist của bạn đã được cập nhật.',
  'Có hoạt động mới trong phòng live.',
];

export default function NotificationsPage() {
  return (
    <main className="route-page-shell">
      <section className="route-hero-card">
        <span className="route-kicker">Notifications</span>
        <h1>Thông báo</h1>
        <p>Theo dõi hoạt động phòng, playlist và các lời mời nghe nhạc.</p>
      </section>

      <section className="route-grid-list">
        {notifications.map((item) => (
          <article key={item} className="route-info-card">
            <strong>{item}</strong>
            <span>Vừa cập nhật</span>
          </article>
        ))}
      </section>
    </main>
  );
}
