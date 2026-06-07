import { playerApi } from '@/services/player.api';

export const playerService = {
  addSong: (data: any) => playerApi.addSong(data),
  searchSongs: (params?: any) => playerApi.searchSongs(params),
  getLyrics: (videoId: string) => playerApi.getLyrics(videoId),
  getSong: (songId: string) => playerApi.getSong(songId),
  getTrendingSongs: (limit?: number) => playerApi.getTrendingSongs(limit),
  incrementPlayCount: (songId: string) => playerApi.incrementPlayCount(songId),
  addToQueue: (roomId: string, songId: string) => playerApi.addToQueue(roomId, songId),
  removeFromQueue: (roomId: string, songId: string) => playerApi.removeFromQueue(roomId, songId),
  getQueue: (roomId: string) => playerApi.getQueue(roomId),
};
