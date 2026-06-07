import { create } from 'zustand';
import type { PlaybackState } from '@/types/socket';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error';

interface SocketState {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastPing: number | null;
  roomId: string | null;
  playbackState: PlaybackState | null;
  error: string | null;
  setConnected: (connected: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setRoomId: (roomId: string | null) => void;
  setPlaybackState: (state: PlaybackState | null) => void;
  setError: (error: string | null) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  connectionStatus: 'disconnected',
  lastPing: null,
  roomId: null,
  playbackState: null,
  error: null,
  setConnected: (connected) => set({ isConnected: connected }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setRoomId: (roomId) => set({ roomId }),
  setPlaybackState: (playbackState) => set({ playbackState }),
  setError: (error) => set({ error }),
}));
