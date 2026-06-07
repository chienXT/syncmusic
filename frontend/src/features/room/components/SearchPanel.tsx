'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import {
  ListMusic,
  Loader2,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import type { Panel } from '@/types/player';
import type { Song } from '@/types/song';
import { getSongMeta, getSongTitle } from '@/lib/songHelpers';

type SearchPanelProps = {
  activePanel: Panel;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  officialOnly: boolean;
  setOfficialOnly: (value: boolean) => void;
  isSearching: boolean;
  isLoadingMoreSearchResults: boolean;
  hasMoreSearchResults: boolean;
  searchError?: string | null;
  searchResults: Song[];
  onSearch: () => void;
  onLoadMore: () => void;
  onAddToQueue: (song: Song) => void;
};

const SearchPanel = ({
  activePanel,
  searchQuery,
  setSearchQuery,
  officialOnly,
  setOfficialOnly,
  isSearching,
  isLoadingMoreSearchResults,
  hasMoreSearchResults,
  searchError,
  searchResults,
  onSearch,
  onLoadMore,
  onAddToQueue,
}: SearchPanelProps) => {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const shouldObserve =
    activePanel === 'search' &&
    hasMoreSearchResults &&
    !isSearching &&
    !isLoadingMoreSearchResults;

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    if (!shouldObserve) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMoreRef.current();
      },
      { rootMargin: '180px', threshold: 0.2 }
    );

    const node = loadMoreRef.current;
    if (node) observer.observe(node);

    return () => observer.disconnect();
  }, [shouldObserve]);

  if (activePanel !== 'search') return null;

  return (
    <section className="search-panel">
      <div className="search-panel-head">
        <div className="search-input-wrap">
          <Search size={17} className="search-input-icon" />

          <input
            className="search-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSearch();
            }}
            placeholder="Tìm bài hát, nghệ sĩ, album..."
            aria-label="Tìm bài hát"
          />

          <button
            type="button"
            className="search-submit-btn"
            onClick={onSearch}
            disabled={isSearching}
            aria-label="Tìm kiếm"
          >
            {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOfficialOnly(!officialOnly)}
          className={`official-toggle ${officialOnly ? 'active' : ''}`}
        >
          <Sparkles size={14} />
          Official only
        </button>
      </div>

      <div className="search-panel-body">
        {searchError && (
          <div className="search-error">
            <strong>Không thể tìm kiếm bài hát</strong>
            <span>{searchError}</span>
          </div>
        )}

        <div className="search-result-list">
          {searchResults.map((song, index) => {
            const title = getSongTitle(song);
            const cover = song.coverArt || song.thumbnail;

            return (
              <motion.article
                key={`${song._id || song.sourceId || song.title || ''}-${index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.16) }}
                className="search-result-item"
              >
                <div className="search-cover">
                  {cover ? (
                    <img src={cover} alt={title} />
                  ) : (
                    <ListMusic size={22} />
                  )}
                </div>

                <div className="search-info">
                  <div className="search-title-row">
                    <h4>{title}</h4>
                  </div>

                  <div className="search-meta">
                    <span>{song.artist || getSongMeta(song)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="search-add-btn"
                  onClick={() => onAddToQueue(song)}
                  title="Thêm vào hàng chờ"
                  aria-label="Thêm vào hàng chờ"
                >
                  <Plus size={18} />
                </button>
              </motion.article>
            );
          })}
        </div>

        {!searchResults.length && !isSearching && !searchError && (
          <div className="search-empty">
            <div>
              <Search size={36} />
            </div>
            <strong>Tìm bài hát từ YouTube</strong>
            <span>Nhập tên bài hát, nghệ sĩ hoặc album để thêm vào hàng chờ.</span>
          </div>
        )}

        {hasMoreSearchResults && (
          <div ref={loadMoreRef} className="search-load-more">
            {isLoadingMoreSearchResults ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Đang tải thêm...
              </>
            ) : (
              'Kéo xuống để tải thêm'
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default SearchPanel;