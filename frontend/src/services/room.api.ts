import api from '@/lib/axios';

const normalizeRoomIdentifier = (value: string) => value.trim().toUpperCase();

type TrendingRoomParams = {
  limit?: number;
  search?: string;
  tags?: string;
  tag?: string;
  mood?: string;
  playingOnly?: boolean;
};

export const roomApi = {
  createRoom: (data: {
    name: string;
    description?: string;
    isPrivate?: boolean;
    maxParticipants?: number;
    tags?: string[];
  }) => api.post('/rooms', data),
  getRooms: (params?: { page?: number; limit?: number; search?: string; tags?: string; includePrivate?: boolean }) =>
    api.get('/rooms', { params }),
  getMyHostedRoom: () => api.get('/rooms/my-hosted'),
  getRoom: (roomId: string) => api.get(`/rooms/${normalizeRoomIdentifier(roomId)}`),
  joinRoom: (inviteCode: string) => api.post('/rooms/join', { inviteCode: normalizeRoomIdentifier(inviteCode) }),
  leaveRoom: (roomId: string) => api.post(`/rooms/${roomId}/leave`),
  getRoomHistory: (roomId: string) => api.get(`/rooms/${normalizeRoomIdentifier(roomId)}/history`),
  updateRoom: (roomId: string, data: any) => api.put(`/rooms/${roomId}`, data),
  deleteRoom: (roomId: string) => api.delete(`/rooms/${roomId}`),
  addModerator: (roomId: string, userId: string) => api.post(`/rooms/${roomId}/moderators`, { userId }),
  removeModerator: (roomId: string, userId: string) => api.delete(`/rooms/${roomId}/moderators`, { data: { userId } }),
  getTrendingRooms: (params?: TrendingRoomParams) => api.get('/rooms/trending', { params }),
  getStats: () => api.get('/rooms/stats'),
};
