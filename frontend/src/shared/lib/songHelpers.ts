import type { Song } from '@/types/song';

export const cleanYoutubeTitle = (title: string): string => {
  let clean = title || '';

  // Xóa nội dung trong ngoặc / bracket thường chứa Official MV, Lyrics...
  clean = clean.replace(/\([^)]*\)/g, '');
  clean = clean.replace(/\[[^\]]*\]/g, '');
  clean = clean.replace(/【[^】]*】/g, '');

  // Xóa các từ thừa hay gặp ở tiêu đề YouTube
  clean = clean.replace(/official\s*(mv|music\s*video|video|audio)?/gi, '');
  clean = clean.replace(/music\s*video|musicvideo/gi, '');
  clean = clean.replace(/lyrics?|lyric\s*video|vietsub|karaoke|cover|remix|live|hd|4k/gi, '');
  clean = clean.replace(/prod\.?\s*.*/gi, '');

  // Xóa ký tự/khoảng trắng thừa
  clean = clean.replace(/\s+/g, ' ');
  clean = clean.replace(/\s*[-|•·]+\s*$/g, '');
  clean = clean.trim();

  return clean;
};

export const cleanText = cleanYoutubeTitle;

export const parseYoutubeTitle = (title: string) => {
  const clean = cleanYoutubeTitle(title);
  const separators = [' - ', ' – ', ' — ', ' | '];

  for (const sep of separators) {
    if (clean.includes(sep)) {
      const [left, ...rest] = clean.split(sep).map((s) => s.trim()).filter(Boolean);
      const right = rest.join(sep).trim();

      if (left && right) {
        return {
          artist: left,
          name: right,
          display: `${right} - ${left}`,
        };
      }
    }
  }

  return {
    artist: '',
    name: clean,
    display: clean,
  };
};

const getRawSongTitle = (song: Song | null | undefined): string => {
  if (!song || typeof song === 'string') return 'Không rõ';
  return song.title || song.sourceId || song._id || 'Không rõ';
};

export const getSongTitle = (song: Song | null | undefined): string => {
  if (!song || typeof song === 'string') return 'Không rõ';

  const parsed = parseYoutubeTitle(getRawSongTitle(song));
  return parsed.name || 'Không rõ';
};

export const getSongMeta = (song: Song | null | undefined): string => {
  if (!song || typeof song === 'string') return '';

  const parsed = parseYoutubeTitle(getRawSongTitle(song));
  return cleanYoutubeTitle(song.artist || parsed.artist || song.album || song.source || '');
};

export const getSongDisplay = (song: Song | null | undefined): string => {
  if (!song || typeof song === 'string') return 'Không rõ';

  const parsed = parseYoutubeTitle(getRawSongTitle(song));
  const artist = cleanYoutubeTitle(song.artist || parsed.artist || '');
  const name = parsed.name || getSongTitle(song);

  return artist ? `${name} - ${artist}` : name;
};
