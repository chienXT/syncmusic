import api from '@/lib/axios';

export const playerApi = {
  addSong: (data: { title: string; source: string; duration: number; coverArt?: string }) =>
    api.post('/songs', data),
  searchSongs: (params?: { query?: string; genre?: string; page?: number; limit?: number; source?: string; officialOnly?: boolean }) =>
    api.get('/songs/search', { params }),
  getLyrics: (videoId: string) => api.get(`/songs/lyrics/${videoId}`),
  getSong: (songId: string) => api.get(`/songs/${songId}`),
  addToQueue: (roomId: string, songId: string) => api.post(`/songs/queue/${roomId}`, { songId }),
  removeFromQueue: (roomId: string, songId: string) => api.delete(`/songs/queue/${roomId}/${songId}`),
  getQueue: (roomId: string) => api.get(`/songs/queue/${roomId}`),
  getTrendingSongs: (limit?: number) => api.get('/songs/trending', { params: { limit } }),
  incrementPlayCount: (songId: string) => api.post(`/songs/${songId}/play`),
};
