import api from '@/lib/axios';

export const lyricsApi = {
  getLyrics: (videoId: string) => api.get(`/songs/lyrics/${videoId}`),
  fetchLyricsBySongId: (songId: string) => api.get(`/lyrics/${songId}`),
};
