'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Music2, RefreshCw, Upload } from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';
import type { Panel } from '@/types/player';
import type { Song } from '@/types/song';
import type { LyricLine } from '@/types/lyrics';

export type LyricsPanelProps = {
  activePanel?: Panel;
  embedded?: boolean;
  currentSong: Song | null;
  lyrics: LyricLine[];
  lyricIdx: number;
  prevLine: LyricLine | null;
  curLine: LyricLine | null;
  nextLine: LyricLine | null;
  linePct: string;
  lyricFetching: boolean;
  lyricsStatus: Record<string, 'searching' | 'not_found' | 'error'> | 'loading' | 'error' | 'success';
  songKey: string;
  lrcInputRef: RefObject<HTMLInputElement>;
  lyricsContainerRef: RefObject<HTMLDivElement>;
  handleLrcFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  retryLyrics: () => void;
  formatDuration: (seconds: number) => string;
};

const LyricsPanel = ({
  activePanel,
  embedded = false,
  currentSong,
  lyrics,
  lyricIdx,
  prevLine,
  curLine,
  nextLine,
  linePct,
  lyricFetching,
  lyricsStatus,
  songKey,
  lrcInputRef,
  lyricsContainerRef,
  handleLrcFile,
  retryLyrics,
}: LyricsPanelProps) => {
  const currentLyricsStatus =
    typeof lyricsStatus === 'string' ? lyricsStatus : (songKey ? lyricsStatus[songKey] : undefined);

  if (!embedded && activePanel !== 'lyrics') return null;

  return (
    <div className={`flex min-h-0 flex-col overflow-hidden ${embedded ? 'lyrics-embedded' : 'h-full'}`}>
      {/* Header - shown in both modes but styled differently */}
      <div className={`flex shrink-0 items-center justify-between ${embedded ? 'lyrics-embedded-header' : 'border-b border-white/[0.06] bg-black/[0.08] px-4 py-3 backdrop-blur-xl'}`}>
        <div>
          <p className={`font-bold ${embedded ? 'lyrics-embedded-title' : 'text-sm text-white'}`}>
            {embedded ? '♪ Lời bài hát' : 'Lyrics'}
          </p>
          {!embedded && <p className="text-[11px] text-white/35">Đồng bộ lời bài hát</p>}
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            disabled={!currentSong || lyricFetching}
            onClick={() => {
              if (currentSong) retryLyrics();
            }}
            className={embedded ? 'lyrics-action-btn' : 'ctrl-btn !h-9 !w-9 disabled:opacity-40'}
            title="Làm mới lời"
            aria-label="Làm mới lời"
          >
            <RefreshCw size={14} className={lyricFetching ? 'animate-spin' : ''} style={embedded ? undefined : { color: 'rgb(var(--ac1))' }} />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            disabled={!currentSong}
            onClick={() => lrcInputRef.current?.click()}
            className={embedded ? 'lyrics-upload-btn' : 'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all disabled:opacity-40'}
            style={embedded ? undefined : { background: 'rgba(var(--ac1),0.12)', borderColor: 'rgba(var(--ac1),0.18)', color: 'rgb(var(--ac1))' }}
          >
            <Upload size={13} />
            <span>Upload</span>
          </motion.button>
        </div>
      </div>

      <div ref={lyricsContainerRef} className={`relative flex flex-1 min-h-0 items-center justify-center overflow-hidden px-5 ${embedded ? 'py-4' : 'py-10'}`}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(var(--ac1),0.04)] to-transparent" />
        </div>

        {!currentSong && (
          <div className="text-center">
            <div className={`mx-auto mb-4 flex items-center justify-center rounded-3xl border ${embedded ? 'h-12 w-12 border-[var(--color-border)] bg-[var(--color-bg-tertiary)]' : 'h-16 w-16 border-white/10 bg-white/[0.04]'}`}>
              <Music2 size={embedded ? 24 : 34} className={embedded ? 'text-[var(--color-text-tertiary)]' : 'text-white/25'} />
            </div>
            <p className={`font-semibold ${embedded ? 'text-sm text-[var(--color-text-secondary)]' : 'text-base text-white/70'}`}>Chưa phát bài hát</p>
          </div>
        )}

        {currentSong && lyrics.length === 0 && (
          <div className={`text-center ${embedded ? 'max-w-[280px]' : 'max-w-[320px]'}`}>
            <motion.div
              animate={lyricFetching ? { rotate: [0, 8, -8, 0] } : {}}
              transition={{ duration: 0.6, repeat: Infinity }}
              className={`mx-auto mb-4 flex items-center justify-center rounded-3xl border ${embedded ? 'h-12 w-12 border-[var(--color-border)] bg-[var(--color-bg-tertiary)]' : 'h-16 w-16 border-white/10 bg-white/[0.04]'}`}
            >
              <Music2 size={embedded ? 24 : 34} className={embedded ? 'text-[var(--color-text-tertiary)]' : 'text-white/25'} />
            </motion.div>
            <p className={`mb-2 font-bold ${embedded ? 'text-base text-[var(--color-text-primary)]' : 'text-lg text-white'}`}>Chưa có lời bài hát</p>
            <p className={`leading-relaxed ${embedded ? 'text-xs text-[var(--color-text-tertiary)]' : 'text-sm text-white/40'}`}>
              {lyricFetching
                ? 'Đang tìm lời đồng bộ...'
                : currentLyricsStatus === 'not_found'
                  ? 'Không tìm thấy lời bài hát. Hãy tải file LRC.'
                  : currentLyricsStatus === 'error'
                    ? 'Đã xảy ra lỗi khi tìm lời bài hát.'
                    : 'Nhấn làm mới hoặc tải file LRC.'}
            </p>
          </div>
        )}

        {lyrics.length > 0 && (
          <div className={`relative w-full ${embedded ? 'max-w-3xl' : 'max-w-5xl'}`}>
            <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-28 bg-gradient-to-b from-[rgb(var(--surf-1))] to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-28 bg-gradient-to-t from-[rgb(var(--surf-1))] to-transparent" />

            <div className={`flex flex-col items-center justify-center ${embedded ? 'gap-4 py-8' : 'gap-7 py-16'}`}>
              <motion.p key={prevLine?.time} className={`select-none px-6 text-center font-bold leading-relaxed text-white/22 ${embedded ? 'max-w-3xl text-base sm:text-lg' : 'max-w-4xl text-lg sm:text-xl lg:text-2xl'}`}>
                {prevLine?.text || ''}
              </motion.p>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${lyricIdx}-${curLine?.time || 0}`}
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.96 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="relative"
                >
                  <motion.p
                    className={`relative z-10 select-none break-words px-4 text-center font-black leading-[1.15] tracking-[-0.04em] ${embedded ? 'max-w-3xl text-xl sm:text-2xl lg:text-3xl' : 'max-w-5xl text-2xl sm:text-4xl lg:text-5xl'}`}
                    style={{
                      backgroundImage: `linear-gradient(90deg, rgb(var(--gold)) 0%, rgb(var(--ac2)) ${linePct}, rgba(255,255,255,0.14) ${linePct})`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                      textShadow: '0 0 28px rgba(var(--ac1),0.14)',
                    }}
                  >
                    {curLine?.text || '...'}
                  </motion.p>

                  <div className="pointer-events-none absolute inset-0 opacity-30 blur-[50px]" style={{ background: 'radial-gradient(circle, rgba(var(--ac1),0.45), transparent 70%)' }} />
                </motion.div>
              </AnimatePresence>

              <motion.p key={nextLine?.time} className={`select-none px-6 text-center font-bold leading-relaxed text-white/22 ${embedded ? 'max-w-3xl text-base sm:text-lg' : 'max-w-4xl text-lg sm:text-xl lg:text-2xl'}`}>
                {nextLine?.text || ''}
              </motion.p>

              <div className={`mt-2 h-[6px] w-full overflow-hidden rounded-full bg-white/[0.06] ${embedded ? 'max-w-xs' : 'max-w-md'}`}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ width: linePct, background: 'linear-gradient(90deg,rgb(var(--gold)),rgb(var(--ac2)))', boxShadow: '0 0 22px rgba(var(--ac2),0.6)' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <input ref={lrcInputRef} type="file" accept=".lrc,text/plain" className="hidden" onChange={handleLrcFile} />
    </div>
  );
};

export default LyricsPanel;