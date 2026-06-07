import Link from 'next/link';

const FAVORITES = [
  {
    title: 'Golden Hour',
    artist: 'JVKE',
    plays: 128,
    duration: '3:54',
    cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Night Changes',
    artist: 'One Direction',
    plays: 84,
    duration: '3:58',
    cover: 'https://images.unsplash.com/photo-1495567720989-cebdbdd97913?auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Có Em',
    artist: 'Madihu',
    plays: 73,
    duration: '4:12',
    cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Sunset Lover',
    artist: 'Petit Biscuit',
    plays: 69,
    duration: '4:03',
    cover: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80',
  },
];

export default function FavoritesPage() {
  return (
    <main className="fv-page">

      {/* ── Hero ── */}
      <section className="fv-hero">
        <div className="fv-hero-inner">
          <span className="fv-kicker">Favorites</span>
          <h1 className="fv-hero-title">Bài hát<br /><em>yêu thích</em></h1>
          <p className="fv-hero-desc">
            Lưu lại những bài hát muốn nghe lại, thêm nhanh vào playlist
            hoặc đẩy ngay vào hàng đợi phòng live.
          </p>
          <div className="fv-hero-actions">
            <Link href="/search" className="fv-btn-primary">🔎 Tìm bài yêu thích</Link>
            <Link href="/playlists" className="fv-btn-secondary">♫ Xem playlist</Link>
          </div>
        </div>

        {/* Stats strip */}
        <div className="fv-hero-stats">
          <div className="fv-stat">
            <strong>{FAVORITES.length}</strong>
            <span>bài hát</span>
          </div>
          <div className="fv-stat-sep" />
          <div className="fv-stat">
            <strong>{FAVORITES.reduce((a, s) => a + s.plays, 0)}</strong>
            <span>lượt phát</span>
          </div>
          <div className="fv-stat-sep" />
          <div className="fv-stat">
            <strong>16:07</strong>
            <span>tổng thời lượng</span>
          </div>
        </div>
      </section>

      {/* ── Section header ── */}
      <div className="fv-section-head">
        <div>
          <span className="fv-kicker">Liked songs</span>
          <h2 className="fv-section-title">Nghe lại nhiều nhất</h2>
        </div>
        <span className="fv-pill">{FAVORITES.length} bài hát</span>
      </div>

      {/* ── Song list ── */}
      <section className="fv-song-list" aria-label="Danh sách yêu thích">

        {/* List header */}
        <div className="fv-list-header" aria-hidden="true">
          <span>#</span>
          <span>Bài hát</span>
          <span>Số lần phát</span>
          <span>Thời lượng</span>
          <span />
        </div>

        {FAVORITES.map((song, index) => (
          <article key={song.title} className="fv-song-row">
            <span className="fv-song-index">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="fv-song-main">
              <img
                src={song.cover}
                alt=""
                className="fv-song-cover"
                loading="lazy"
              />
              <div className="fv-song-info">
                <h3 className="fv-song-title">{song.title}</h3>
                <p className="fv-song-artist">{song.artist}</p>
              </div>
            </div>
            <span className="fv-song-plays">{song.plays} lần</span>
            <span className="fv-song-duration">{song.duration}</span>
            <div className="fv-song-actions">
              <button type="button" className="fv-action-btn" aria-label="Thêm vào hàng đợi">＋</button>
              <button type="button" className="fv-action-btn fv-heart" aria-label="Bỏ yêu thích">♥</button>
            </div>
          </article>
        ))}
      </section>

    </main>
  );
}