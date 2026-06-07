import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add request interceptor to include token
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (process.env.NODE_ENV === 'development') {
    console.log('📤 API Request:', config.method?.toUpperCase(), config.url, 'data:', config.data);
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📥 API Response:', response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError' || error.name === 'AbortError') {
      return Promise.reject(error);
    }

    if (!error.response && error.message === 'Network Error') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ API Network Error:', error.config?.url);
      }
      return Promise.reject(error);
    }

    console.error('❌ API Error:', error.response?.status, error.config?.url, error.response?.data);
    if (error.response?.status === 401) {
      Cookies.remove('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { username?: string; email?: string; password: string }) =>
    api.post('/auth/login', data),
  googleLogin: () => {
    window.location.href = `${API_URL}/api/auth/google`;
  },
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  updateProfile: (data: { username?: string; bio?: string; avatar?: string }) =>
    api.put('/auth/profile', data),
};

// Room API
export const roomAPI = {
  createRoom: (data: { name: string; description?: string; isPrivate?: boolean; maxParticipants?: number; tags?: string[] }) =>
    api.post('/rooms', data),
  getRooms: (params?: { page?: number; limit?: number; search?: string; tags?: string; includePrivate?: boolean }) =>
    api.get('/rooms', { params }),
  getMyHostedRoom: () =>
    api.get('/rooms/my-hosted'),
  getRoom: (identifier: string) =>
    api.get(`/rooms/${identifier}`),
  getStats: () =>
    api.get('/rooms/stats'),
  joinRoom: (inviteCode: string) =>
    api.post('/rooms/join', { inviteCode }),
  leaveRoom: (roomId: string) =>
    api.post(`/rooms/${roomId}/leave`),
  updateRoom: (roomId: string, data: any) =>
    api.put(`/rooms/${roomId}`, data),
  deleteRoom: (roomId: string) =>
    api.delete(`/rooms/${roomId}`),
  addModerator: (roomId: string, userId: string) =>
    api.post(`/rooms/${roomId}/moderators`, { userId }),
  removeModerator: (roomId: string, userId: string) =>
    api.delete(`/rooms/${roomId}/moderators`, { data: { userId } }),
  getTrendingRooms: (limit?: number) =>
    api.get('/rooms/trending', { params: { limit } }),
  getRoomHistory: (roomId: string) =>
    api.get(`/rooms/${roomId}/history`),
};

// Song API
export const songAPI = {
  addSong: (data: any) =>
    api.post('/songs', data),
  searchSongs: (params?: { query?: string; genre?: string; page?: number; limit?: number; source?: string; officialOnly?: boolean; pageToken?: string }) =>
    api.get('/songs/search', { params }),
  getLyrics: (videoId: string) =>
    api.get(`/songs/lyrics/${videoId}`),
  getSong: (songId: string) =>
    api.get(`/songs/${songId}`),
  getTrendingSongs: (limit?: number) =>
    api.get('/songs/trending', { params: { limit } }),
  getTopPlayedSongs: (limit?: number) =>
    api.get('/songs/top/played', { params: { limit } }),
  getTopLikedSongs: (limit?: number) =>
    api.get('/songs/top/liked', { params: { limit } }),
  incrementPlayCount: (songId: string) =>
    api.post(`/songs/${songId}/play`),
  addToQueue: (roomId: string, songId: string) =>
    api.post('/songs/queue/' + roomId, { songId }),
  playInRoom: (roomId: string, songId: string) =>
    api.post(`/songs/play/${roomId}`, { songId }),
  removeFromQueue: (roomId: string, songId: string) =>
    api.delete(`/songs/queue/${roomId}/${songId}`),
  getQueue: (roomId: string) =>
    api.get(`/songs/queue/${roomId}`),
  getLikeStatus: (songId: string) =>
    api.get(`/songs/${songId}/like`),
  likeSong: (songId: string) =>
    api.post(`/songs/${songId}/like`),
  unlikeSong: (songId: string) =>
    api.delete(`/songs/${songId}/like`),
};

// Playlist API
export const playlistAPI = {
  createPlaylist: (data: { name: string; description?: string; isPublic?: boolean; color?: string }) =>
    api.post('/playlists', data),
  getUserPlaylists: (userId?: string) =>
    api.get(`/playlists/user/${userId || 'me'}`),
  getPlaylist: (playlistId: string) =>
    api.get(`/playlists/${playlistId}`),
  updatePlaylist: (playlistId: string, data: any) =>
    api.put(`/playlists/${playlistId}`, data),
  deletePlaylist: (playlistId: string) =>
    api.delete(`/playlists/${playlistId}`),
  addSongToPlaylist: (playlistId: string, songId: string) =>
    api.post(`/playlists/${playlistId}/songs`, { songId }),
  removeSongFromPlaylist: (playlistId: string, songId: string) =>
    api.delete(`/playlists/${playlistId}/songs/${songId}`),
  toggleFollowPlaylist: (playlistId: string) =>
    api.post(`/playlists/${playlistId}/follow`),
  getPublicPlaylists: (params?: { page?: number; limit?: number }) =>
    api.get('/playlists/public', { params }),
};

// User API
export const userAPI = {
  getUser: (userId: string) =>
    api.get(`/users/${userId}`),
  searchUsers: (query: string) =>
    api.get('/users/search', { params: { query } }),
  sendFriendRequest: (userId: string) =>
    api.post(`/users/${userId}/friend-request`),
  acceptFriendRequest: (userId: string) =>
    api.post(`/users/${userId}/friend-request/accept`),
  declineFriendRequest: (userId: string) =>
    api.post(`/users/${userId}/friend-request/decline`),
  removeFriend: (userId: string) =>
    api.delete(`/users/${userId}/friends`),
  getFriendRequests: () =>
    api.get('/users/friend-requests'),
  updateStatus: (status: string) =>
    api.put('/users/status', { status }),
  addToRecentlyPlayed: (songId: string) =>
    api.post('/users/recently-played', { songId }),
  getRecentlyPlayed: () =>
    api.get('/users/recently-played'),
  updateProfile: (data: { username?: string; bio?: string; avatar?: string }) =>
    authAPI.updateProfile(data),
  updatePreferences: (data: { theme?: string; notifications?: boolean; autoPlay?: boolean }) =>
    api.put('/users/preferences', data),
};

// Message API
export const messageAPI = {
  getRoomMessages: (roomId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/messages/room/${roomId}`, { params }),
  sendMessage: (roomId: string, data: { content: string; type?: string; replyTo?: string }) =>
    api.post(`/messages/room/${roomId}`, data),
  editMessage: (messageId: string, content: string) =>
    api.put(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId: string) =>
    api.delete(`/messages/${messageId}`),
  addReaction: (messageId: string, emoji: string) =>
    api.post(`/messages/${messageId}/reaction`, { emoji }),
  removeReaction: (messageId: string, emoji: string) =>
    api.delete(`/messages/${messageId}/reaction`, { data: { emoji } }),
};

// Admin API
export const adminAPI = {
  getDashboard: () =>
    api.get('/admin/dashboard'),
  getStats: () =>
    api.get('/admin/stats'),
  getUsers: (params?: { page?: number; limit?: number }) =>
    api.get('/admin/users', { params }),
  searchUsers: (query: string) =>
    api.get('/admin/users/search', { params: { query } }),
  setUserRole: (userId: string, role: string) =>
    api.put(`/admin/users/${userId}/role`, { role }),
  getRooms: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/admin/rooms', { params }),
  getLyricsCache: (params?: { limit?: number; search?: string }) =>
    api.get('/admin/lyrics-cache', { params }),
  updateLyricsCache: (sourceId: string, data: any) =>
    api.put(`/admin/lyrics/${sourceId}`, data),
  deleteLyricsCache: (sourceId: string) =>
    api.delete(`/admin/lyrics/${sourceId}`),
  updateRoom: (roomId: string, data: any) =>
    api.put(`/admin/rooms/${roomId}`, data),
  deleteRoom: (roomId: string) =>
    api.delete(`/admin/rooms/${roomId}`),
};
