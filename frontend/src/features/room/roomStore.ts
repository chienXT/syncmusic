import { create } from 'zustand';
import { roomService } from './room.service';
import { usePlayerStore } from '@/features/player/playerStore';
import type { Room } from '@/types/room';


interface RoomState {
  currentRoom: Room | null;
  rooms: Room[];
  isLoading: boolean;
  isHost: boolean;
  isModerator: boolean;
  isRoomMinimized: boolean;
  keepRoomAlive: boolean;
  playbackState: {
    isPlaying: boolean;
    currentTime: number;
    currentSong: any;
    lastUpdateTime: number;
  };
  voiceStage: {
    slots: { slot1: string | null; slot2: string | null };
    speaking: string[];
  };
  
  // Actions
  setCurrentRoom: (room: Room | null) => void;
  setRooms: (rooms: Room[]) => void;
  setRoomMinimized: (isMinimized: boolean) => void;
  setKeepRoomAlive: (keepAlive: boolean) => void;
  setVoiceStage: (stage: any) => void;
  fetchRooms: (params?: any) => Promise<void>;
  fetchRoom: (identifier: string) => Promise<void>;
  createRoom: (data: any) => Promise<void>;
  joinRoom: (inviteCode: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  updateRoom: (roomId: string, data: any) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  fetchTrendingRooms: (limit?: number) => Promise<void>;
  setPlaybackState: (state: any) => void;
  setPermissions: (isHost: boolean, isModerator: boolean) => void;
}

const roomFetchInFlight = new Map<string, Promise<void>>();
const roomsFetchInFlight = new Map<string, Promise<void>>();

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: null,
  rooms: [],
  isLoading: false,
  isHost: false,
  isModerator: false,
  isRoomMinimized: false,
  keepRoomAlive: false,
  playbackState: {
    isPlaying: false,
    currentTime: 0,
    currentSong: null,
    lastUpdateTime: Date.now(),
  },
  voiceStage: {
    slots: { slot1: null, slot2: null },
    speaking: [],
  },
  
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setRooms: (rooms) => set({ rooms }),
  setRoomMinimized: (isMinimized) => set({ isRoomMinimized: isMinimized }),
  setKeepRoomAlive: (keepAlive) => set({ keepRoomAlive: keepAlive }),
  setPlaybackState: (state) => set({ playbackState: state }),
  setVoiceStage: (voiceStage) => set({ voiceStage }),
  setPermissions: (isHost, isModerator) => set({ isHost, isModerator }),
  
  fetchRooms: async (params) => {
    const key = JSON.stringify(params || {});
    if (roomsFetchInFlight.has(key)) {
      await roomsFetchInFlight.get(key);
      return;
    }

    const fetchPromise = (async () => {
      set({ isLoading: true });
      try {
        const response = await roomService.getRooms(params);
        set({ rooms: response.data.data.rooms });
      } catch (error: any) {
        console.error('Fetch rooms error:', error);
      } finally {
        set({ isLoading: false });
      }
    })();

    roomsFetchInFlight.set(key, fetchPromise);
    try {
      await fetchPromise;
    } finally {
      roomsFetchInFlight.delete(key);
    }
  },
  
  fetchRoom: async (identifier) => {
    if (roomFetchInFlight.has(identifier)) {
      await roomFetchInFlight.get(identifier);
      return;
    }

    const fetchPromise = (async () => {
      set({ isLoading: true });
      try {
        const response = await roomService.getRoom(identifier);
        set({ currentRoom: response.data.data.room });
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 404) {
          set({ currentRoom: null });
          console.warn('Room not found:', identifier);
        } else {
          console.error('Fetch room error:', error);
        }
      } finally {
        set({ isLoading: false });
      }
    })();

    roomFetchInFlight.set(identifier, fetchPromise);
    try {
      await fetchPromise;
    } finally {
      roomFetchInFlight.delete(identifier);
    }
  },
  
  createRoom: async (data) => {
    set({ isLoading: true });
    try {
      const response = await roomService.createRoom(data);
      set({ currentRoom: response.data.data.room });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create room');
    } finally {
      set({ isLoading: false });
    }
  },
  
  joinRoom: async (inviteCode) => {
    set({ isLoading: true });
    try {
      const response = await roomService.joinRoom(inviteCode);
      set({ currentRoom: response.data.data.room });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to join room');
    } finally {
      set({ isLoading: false });
    }
  },
  
  leaveRoom: async (roomId) => {
    set({ isLoading: true });
    try {
      await roomService.leaveRoom(roomId);
      usePlayerStore.getState().reset();
      set({ currentRoom: null, isHost: false, isModerator: false, keepRoomAlive: false, isRoomMinimized: false });
    } catch (error: any) {
      console.error('Leave room error:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateRoom: async (roomId, data) => {
    set({ isLoading: true });
    try {
      const response = await roomService.updateRoom(roomId, data);
      set({ currentRoom: response.data.data.room });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update room');
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteRoom: async (roomId) => {
    set({ isLoading: true });
    try {
      await roomService.deleteRoom(roomId);
      set({ currentRoom: null, isHost: false, isModerator: false });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete room');
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchTrendingRooms: async (limit) => {
    set({ isLoading: true });
    try {
      const response = await roomService.getTrendingRooms({ limit });
      set({ rooms: response.data.data.rooms });
    } catch (error: any) {
      console.error('Fetch trending rooms error:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
