import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';

/**
 * Socket.IO client wrapper
 * Handles realtime communication for music synchronization and chat
 */

let socket: Socket | null = null;

/**
 * Initialize Socket.IO connection
 */
export const initializeSocket = (): Socket => {
  const token = Cookies.get('token');
  
  if (socket?.connected) {
    return socket;
  }
  
  socket = io(WS_URL, {
    auth: {
      token: token || '',
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    forceNew: true,
  });
  
  return socket;
};

/**
 * Get existing socket instance or create new one
 */
export const getSocket = (): Socket => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Reconnect socket with new token
 */
export const reconnectSocket = (): void => {
  disconnectSocket();
  initializeSocket();
};

/**
 * Socket event types
 */
export type SocketEvents = {
  // Room events
  join_room: { roomId: string };
  leave_room: void;
  room_state: any;
  user_joined: { userId: string; username: string; avatar?: string };
  user_left: { userId: string; username: string };
  room_updated: any;
  
  // Playback events
  play: { currentTime?: number };
  pause: { currentTime?: number };
  seek: { currentTime: number };
  skip: void;
  vote_skip: void;
  sync_request: void;
  playback_sync: any;
  song_changed: any;
  playback_ended: void;
  vote_update: any;
  sync_response: any;
  
  // Chat events
  send_message: { content: string; type?: string; replyTo?: string };
  typing: void;
  stop_typing: void;
  new_message: any;
  message_sent: any;
  user_typing: { userId: string; username: string };
  user_stop_typing: { userId: string };
  add_reaction: { messageId: string; emoji: string };
  message_updated: any;
  
  // Presence events
  update_status: { status: string };
  user_status_changed: { userId: string; status: string };
  
  // Error
  error: { message: string };
};

export default getSocket;
