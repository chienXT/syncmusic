'use client';

import { useState } from 'react';

export default function SearchPage() {
  const [query, setQuery] = useState('');

  return (
    <main className="sr-page">
      <section className="sr-hero">
        <span className="sr-kicker">Search</span>
        <h1 className="sr-title">Tìm kiếm bài hát</h1>
        <p className="sr-sub">
          Tìm bài hát, nghệ sĩ hoặc album để thêm vào playlist và phòng live.
        </p>
        <div className="sr-search-bar">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nhập tên bài hát hoặc ca sĩ..."
            aria-label="Tìm kiếm bài hát"
          />
          <button type="button" className="sr-search-btn">
            Tìm kiếm
          </button>
        </div>
      </section>

      <div className="sr-empty">
        <span className="sr-empty-icon" aria-hidden="true">🎵</span>
        <h3>{query ? `Sẵn sàng tìm: ${query}` : 'Nhập từ khóa để bắt đầu tìm kiếm.'}</h3>
        <p>
          Gõ tên bài hát, ca sĩ hoặc album bạn muốn tìm.
          Kết quả sẽ hiển thị ngay tại đây.
        </p>
      </div>
    </main>
  );
}
