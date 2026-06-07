import { lyricsApi } from '@/services/lyrics.api';

export const lyricsService = {
  getLyrics: (videoId: string) => lyricsApi.getLyrics(videoId),
  fetchLyricsBySongId: (songId: string) => lyricsApi.fetchLyricsBySongId(songId),
};
