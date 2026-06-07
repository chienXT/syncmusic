import { roomApi } from '@/services/room.api';

export const roomService = {
  createRoom: (data: any) => roomApi.createRoom(data),
  getRooms: (params?: any) => roomApi.getRooms(params),
  getMyHostedRoom: () => roomApi.getMyHostedRoom(),
  getRoom: (identifier: string) => roomApi.getRoom(identifier),
  getStats: () => roomApi.getStats(),
  joinRoom: (inviteCode: string) => roomApi.joinRoom(inviteCode),
  leaveRoom: (roomId: string) => roomApi.leaveRoom(roomId),
  updateRoom: (roomId: string, data: any) => roomApi.updateRoom(roomId, data),
  deleteRoom: (roomId: string) => roomApi.deleteRoom(roomId),
  addModerator: (roomId: string, userId: string) => roomApi.addModerator(roomId, userId),
  removeModerator: (roomId: string, userId: string) => roomApi.removeModerator(roomId, userId),
  getRoomHistory: (roomId: string) => roomApi.getRoomHistory(roomId),
  getTrendingRooms: (params?: {
    limit?: number;
    search?: string;
    tags?: string;
    tag?: string;
    mood?: string;
    playingOnly?: boolean;
  }) => roomApi.getTrendingRooms(params),
};
