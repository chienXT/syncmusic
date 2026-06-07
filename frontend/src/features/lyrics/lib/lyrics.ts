import type { LyricLine } from '@/types/lyrics';

const sanitizeTitle = (title: string) =>
  title
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/feat\.?[^-]*/gi, '')
    .replace(/official[^-]*/gi, '')
    .trim();

export const parseLrc = (content: string): LyricLine[] => {
  const result: LyricLine[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const tags = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    if (!tags.length) continue;
    const text = line.replace(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g, '').trim();
    if (!text) continue;
    for (const tag of tags) {
      const dec = tag[3] || '0';
      result.push({
        time: Number(tag[1]) * 60 + Number(tag[2]) + Number(dec) / Math.pow(10, dec.length),
        text,
        duration: 0,
      });
    }
  }
  return result.sort((a, b) => a.time - b.time);
};

export const parseBackendLyrics = (raw: any): LyricLine[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((line: any) => ({
      time: Number(line?.start) || 0,
      text: String(line?.text || '').trim(),
      duration: Math.max(0, Number(line?.duration) || 0),
    }))
    .filter((line: LyricLine) => line.text.length > 0)
    .sort((a: LyricLine, b: LyricLine) => a.time - b.time);
};

export const fetchLrcLib = async (title: string, artist?: string): Promise<LyricLine[] | null> => {
  const cleanedTitle = sanitizeTitle(title).trim();
  const cleanedArtist = (artist || '').trim();
  if (!cleanedTitle) return null;

  const tryParse = (payload: any): LyricLine[] | null => {
    const synced = typeof payload?.syncedLyrics === 'string' ? payload.syncedLyrics : '';
    if (!synced) return null;
    const parsed = parseLrc(synced);
    return parsed.length ? parsed : null;
  };

  const urls = [
    cleanedArtist
      ? `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}`
      : `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanedTitle)}`,
    cleanedArtist
      ? `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}`
      : `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanedTitle)}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          const parsed = tryParse(item);
          if (parsed) return parsed;
        }
      } else {
        const parsed = tryParse(data);
        if (parsed) return parsed;
      }
    } catch {
      // ignore network errors
    }
  }

  return null;
};

export const findLyricIndex = (lyrics: LyricLine[], currentTime: number): number => {
  if (!lyrics.length) return -1;
  for (let i = lyrics.length - 1; i >= 0; i -= 1) {
    if (currentTime + 0.05 >= lyrics[i].time) return i;
  }
  return -1;
};
