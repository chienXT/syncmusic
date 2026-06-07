import { io, type Socket } from 'socket.io-client';
import { getToken } from '@/lib/auth';
import { socketClientEvents, socketServerEvents } from './events';
import type { SocketClientToServerEvents, SocketServerToClientEvents } from '@/types/socket';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || API_ORIGIN;
let socket: Socket<SocketServerToClientEvents, SocketClientToServerEvents> | null = null;

import { useSocketStore } from '@/store/socketStore';
import { useToastStore } from '@/store/toastStore';

const createSocket = () => {
  const token = getToken();
  const socketUrl = WS_URL;

  console.info('[socket] connecting to', socketUrl);

  const newSocket = io(socketUrl, {
    auth: { token: token || '' },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: false,
    withCredentials: true,
    path: '/socket.io',
  });

  newSocket.on('connect', () => {
    console.info('[socket] connected');
    useSocketStore.getState().setConnected(true);
    useSocketStore.getState().setConnectionStatus('connected');
    useToastStore.getState().addToast('Đã kết nối máy chủ', 'success');
  });

  newSocket.on('disconnect', (reason) => {
    console.warn('[socket] disconnected:', reason);
    useSocketStore.getState().setConnected(false);
    useSocketStore.getState().setConnectionStatus('disconnected');
    if (reason === 'io server disconnect') {
      newSocket.connect();
    }
  });

  newSocket.on('connect_error', (error) => {
    console.error('[socket] connect_error', error);
    useSocketStore.getState().setConnectionStatus('error');
    useSocketStore.getState().setError(error.message);
    useToastStore.getState().addToast('Lỗi kết nối máy chủ: ' + error.message, 'error');
  });

  newSocket.on('reconnect_attempt', (attempt) => {
    console.info('[socket] reconnecting... attempt:', attempt);
    useSocketStore.getState().setConnectionStatus('reconnecting');
  });

  newSocket.on('reconnect', (attempt) => {
    console.info('[socket] reconnected after', attempt, 'attempts');
    useSocketStore.getState().setConnected(true);
    useSocketStore.getState().setConnectionStatus('connected');
    useToastStore.getState().addToast('Đã kết nối lại thành công', 'success');
  });

  newSocket.on('reconnect_error', (error) => {
    console.error('[socket] reconnect_error', error);
    useSocketStore.getState().setConnectionStatus('error');
  });

  newSocket.on('reconnect_failed', () => {
    console.error('[socket] reconnect_failed');
    useSocketStore.getState().setConnectionStatus('error');
    useToastStore.getState().addToast('Không thể kết nối lại với máy chủ', 'error');
  });

  socket = newSocket;
  return newSocket;
};

export const getSocket = () => {
  if (!socket) {
    socket = createSocket();
  }
  if (!socket.connected && !socket.active) {
    socket.connect();
  }
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const reconnectSocket = () => {
  disconnectSocket();
  return getSocket();
};

export const isSocketConnected = () => !!socket?.connected;

export const eventNames = {
  ...socketClientEvents,
  ...socketServerEvents,
};
