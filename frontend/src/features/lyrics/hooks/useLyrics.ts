import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { parseLrc, parseBackendLyrics, fetchLrcLib, findLyricIndex } from '@/lib/lyrics';
import { formatDuration } from '@/lib/utils';
import { songAPI } from '@/lib/api';
import type { LyricLine } from '@/types/lyrics';
import type { Song } from '@/types/song';

export const useLyrics = (currentSong: Song | null, currentTime: number) => {
  const [lyricsBySong, setLyricsBySong] = useState<Record<string, LyricLine[]>>({});
  const [lyricsStatus, setLyricsStatus] = useState<Record<string, 'searching' | 'not_found' | 'error'>>({});
  const lyricsAttempted = useRef(new Set<string>());
  const lrcInputRef = useRef<HTMLInputElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  const songKey = useMemo(() => currentSong ? String(currentSong._id || currentSong.sourceId || '') : '', [currentSong]);
  const lyrics = useMemo(() => (songKey ? lyricsBySong[songKey] || [] : []), [lyricsBySong, songKey]);
  const lyricIdx = useMemo(() => findLyricIndex(lyrics, currentTime), [lyrics, currentTime]);
  const lyricFetching = lyricsStatus[songKey] === 'searching';
  const prevLine = lyricIdx > 0 ? lyrics[lyricIdx - 1] : null;
  const curLine = lyricIdx >= 0 ? lyrics[lyricIdx] : null;
  const nextLine = lyricIdx >= 0 ? lyrics[lyricIdx + 1] || null : null;
  const lineDur = curLine ? Math.max(1.5, (nextLine?.time || curLine.time + 4) - curLine.time) : 1;
  const lineProg = curLine ? Math.max(0, Math.min(1, (currentTime - curLine.time) / lineDur)) : 0;
  const linePct = `${Math.round(lineProg * 100)}%`;

  const attemptLyrics = useCallback(async (song: Song) => {
    const key = String(song._id || song.sourceId || '');
    if (!key || !song.title) return;

    setLyricsStatus((prev) => ({ ...prev, [key]: 'searching' }));
    try {
      if (song.source === 'youtube' && song.sourceId) {
        try {
          const response = await songAPI.getLyrics(song.sourceId);
          const parsed = parseBackendLyrics(response.data?.data?.lyrics);
          if (parsed.length) {
            setLyricsBySong((prev) => ({ ...prev, [key]: parsed }));
            setLyricsStatus((prev) => { const next = { ...prev }; delete next[key]; return next; });
            return;
          }
        } catch {
          // ignore internal fetch failure
        }
      }

      const found = await fetchLrcLib(song.title, song.artist);
      if (found?.length) {
        setLyricsBySong((prev) => ({ ...prev, [key]: found }));
        setLyricsStatus((prev) => { const next = { ...prev }; delete next[key]; return next; });
        return;
      }

      setLyricsStatus((prev) => ({ ...prev, [key]: 'not_found' }));
    } catch {
      setLyricsStatus((prev) => ({ ...prev, [key]: 'error' }));
    }
  }, []);

  const handleLrcFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    const content = await file.text();
    const parsed = parseLrc(content);
    if (!parsed.length) {
      alert('File LRC không hợp lệ.');
      return;
    }
    if (!songKey) {
      alert('Không có bài hát đang phát.');
      return;
    }
    setLyricsBySong((prev) => ({ ...prev, [songKey]: parsed }));
    setLyricsStatus((prev) => { const next = { ...prev }; delete next[songKey]; return next; });
    lyricsAttempted.current.add(songKey);
    setTimeout(() => { if (event.target) event.target.value = ''; }, 0);
  }, [songKey]);

  useEffect(() => {
    if (!songKey || !currentSong?.title || lyrics.length || lyricsAttempted.current.has(songKey)) return;
    lyricsAttempted.current.add(songKey);
    void attemptLyrics(currentSong);
  }, [attemptLyrics, currentSong, lyrics.length, songKey]);

  useEffect(() => {
    if (lyricsContainerRef.current && lyricIdx >= 0) {
      const active = lyricsContainerRef.current.querySelector('[data-active-lyric="true"]');
      if (active instanceof HTMLElement) {
        active.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [lyricIdx]);

  return {
    lyrics,
    lyricIdx,
    prevLine,
    curLine,
    nextLine,
    linePct,
    lyricFetching,
    lyricsStatus,
    lrcInputRef,
    lyricsContainerRef,
    handleLrcFile,
    retryLyrics: () => { if (currentSong) void attemptLyrics(currentSong); },
    formatDuration,
  };
};
