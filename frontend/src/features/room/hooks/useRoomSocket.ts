import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useRoomStore } from '@/store/roomStore';
import { getSocket } from '@/lib/socket';
import { messageAPI } from '@/lib/api';
import { roomService } from '../room.service';
import { emitJoinRoom, emitLeaveRoom, emitSendMessage, emitRequestSync } from '@/socket/emitters';
import { registerRoomListeners, removeRoomListeners, type RoomSocketHandlers } from '@/socket/listeners';
import type { Message } from '@/types/message';
import type { Room } from '@/types/room';

export type PlaybackSyncData = {
  isPlaying: boolean;
  currentTime: number;
  currentSong?: any;
  lastUpdateTime?: any;
};

export const useRoomSocket = (roomId: string, handlers: RoomSocketHandlers = {}) => {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const {
    currentRoom,
    fetchRoom,
    leaveRoom,
    setCurrentRoom,
    setPermissions,
    setPlaybackState,
    setKeepRoomAlive,
    setRoomMinimized,
  } = useRoomStore();

  const socket = getSocket();
  const [isConnected, setIsConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomClosed, setRoomClosed] = useState(false);
  const [joinState, setJoinState] = useState<'idle' | 'joining' | 'joined'>('idle');
  const isMountedRef = useRef(true);
  const handlersRef = useRef(handlers);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncingAtRef = useRef(0);
  const syncStatusRef = useRef<'synced' | 'syncing' | 'error'>('synced');
  const currentRoomRef = useRef<Room | null>(currentRoom);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    if (!isAuthenticated || !user || !roomId) return;

    const isObjectId = /^[a-f\d]{24}$/i.test(roomId);
    const messageRoomId = currentRoom?._id || (isObjectId ? roomId : null);

    // Route phòng có thể là inviteCode như OP5RDR, nhưng API messages cần room _id.
    // Vì vậy chờ fetchRoom resolve currentRoom._id rồi mới tải lịch sử chat.
    if (!messageRoomId) return;

    let cancelled = false;
    messageAPI
      .getRoomMessages(messageRoomId, { limit: 50 })
      .then((response) => {
        if (cancelled || !isMountedRef.current) return;
        const data = response.data?.data;
        const loadedMessages = data?.messages || data || [];
        if (Array.isArray(loadedMessages)) {
          setMessages(loadedMessages as any);
        }
      })
      .catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[room] Không thể tải lịch sử chat', error?.response?.data || error?.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentRoom?._id, isAuthenticated, roomId, user]);

  const chatMessages = useMemo(() => messages.filter((message) => message.type !== 'system'), [messages]);
  const latestSys = useMemo(() => messages.filter((message) => message.type === 'system').pop() || null, [messages]);

  const handleSendMessage = useCallback((content: string, type: 'text' | 'system' = 'text') => {
    if (!content.trim()) return;
    emitSendMessage(socket, currentRoom?._id ?? roomId, content);
  }, [roomId, currentRoom?._id, socket]);

  const applyPlayback = useCallback((data: PlaybackSyncData) => {
    const playback = {
      isPlaying: data.isPlaying,
      currentTime: data.currentTime,
      currentSong: data.currentSong ?? currentRoom?.playback?.currentSong,
      lastUpdateTime: data.lastUpdateTime,
    };

    setPlaybackState(playback);
    handlersRef.current.onPlaybackSync?.(data);
  }, [currentRoom?.playback?.currentSong, setPlaybackState]);

  const doJoinRoom = useCallback(async () => {
    if (!currentRoom || !user || !socket.connected || joinState !== 'idle') return;

    setJoinState('joining');
    const isParticipant = currentRoom.participants.some((participant: any) =>
      participant.user?._id === user._id || participant.user === user._id
    );

    try {
      if (!isParticipant) {
        const response = await roomService.joinRoom(currentRoom.inviteCode);
        setCurrentRoom(response.data.data.room);
        emitJoinRoom(socket, response.data.data.room._id);
      } else {
        emitJoinRoom(socket, currentRoom._id);
      }
      setJoinState('joined');
    } catch {
      setJoinState('idle');
    }
  }, [currentRoom, joinState, setCurrentRoom, socket, user]);

  const handleLeaveRoom = useCallback(async () => {
    if (currentRoom?._id) {
      setKeepRoomAlive(false);
      setRoomMinimized(false);
      setPlaybackState({
        isPlaying: false,
        currentTime: 0,
        currentSong: null,
        lastUpdateTime: Date.now(),
      });
      await leaveRoom(currentRoom._id);
      emitLeaveRoom(socket);
    }
  }, [currentRoom?._id, leaveRoom, setKeepRoomAlive, setRoomMinimized, socket]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (useAuthStore.getState().isInitialized) {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, router, user]);

  useEffect(() => {
    if (!isAuthenticated || !user || !roomId) return;
    const sameRoom =
      currentRoom?._id?.toString() === roomId ||
      currentRoom?.inviteCode?.toString() === roomId;
    if (!sameRoom) {
      // Leave the old room if we are in one
      if (currentRoom?._id) {
        emitLeaveRoom(socket);
      }
      setCurrentRoom(null);
      setRoomClosed(false);
      setJoinState('idle');
      fetchRoom(roomId);
    }
  }, [currentRoom?._id, currentRoom?.inviteCode, fetchRoom, isAuthenticated, roomId, setCurrentRoom, user, socket]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const handleConnect = () => {
      if (!isMountedRef.current) return;
      setIsConnected(true);
      setSyncStatus('synced');
      setJoinState('idle');
      doJoinRoom();
    };

    const handleDisconnect = () => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      setSyncStatus('error');
      setJoinState('idle');
    };

    const handleConnectError = () => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      setSyncStatus('error');
    };

    const typedHandlers: RoomSocketHandlers = {
      onRoomState: (payload) => {
        if (!isMountedRef.current) return;
        if (payload.room) setCurrentRoom(payload.room as any);
        setPermissions(payload.isHost, payload.isModerator || false);
        setPlaybackState((payload.playback || payload.room.playback) as any);

        // Load initial messages if provided
        if (payload.messages && payload.messages.length > 0) {
          setMessages(payload.messages as any);
        }

        handlersRef.current.onRoomState?.(payload);
        setSyncStatus('synced');
        setRoomClosed(payload.room?.isActive === false && !payload.isHost);
      },
      onPlaybackSync: (data) => {
        if (!isMountedRef.current) return;

        // playback_sync là luồng sync định kỳ khi nhạc đang chạy.
        // Không chuyển sang "syncing" ở đây để tránh nháy "Đồng bộ/Đang sync" liên tục.
        applyPlayback(data);

        if (syncStatusRef.current !== 'synced') {
          setSyncStatus('synced');
          syncStatusRef.current = 'synced';
        }

        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = null;
        }
      },
      onSongChanged: (data) => {
        if (!isMountedRef.current) return;
        handlersRef.current.onSongChanged?.(data);
      },
      onRoomUpdated: (payload) => {
        if (!isMountedRef.current) return;
        setCurrentRoom(payload.room as any);
        if (payload.room?.playback) {
          setPlaybackState(payload.room.playback);
        }
        handlersRef.current.onRoomUpdated?.(payload);
      },
      onSyncResponse: (data) => {
        if (!isMountedRef.current) return;
        handlersRef.current.onSyncResponse?.(data);
        applyPlayback(data);
      },
      onQueueUpdated: (payload) => {
        if (!isMountedRef.current) return;
        const room = currentRoomRef.current;
        const nextRoom = room ? { ...room, queue: payload.queue } : room;
        setCurrentRoom(nextRoom as any);
      },
      onNewMessage: (message) => {
        if (!isMountedRef.current) return;
        setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message]);
      },
      onMessageSent: (message) => {
        if (!isMountedRef.current) return;
        setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message]);
      },
      onUserJoined: (payload) => {
        if (!isMountedRef.current) return;
        setMessages((current) => [
          ...current,
          { _id: `sj-${payload.userId}-${Date.now()}`, type: 'system', content: `${payload.username} đã vào phòng`, createdAt: new Date().toISOString() },
        ]);
      },
      onUserLeft: (payload) => {
        if (!isMountedRef.current) return;
        setMessages((current) => [
          ...current,
          { _id: `sl-${payload.userId}-${Date.now()}`, type: 'system', content: `${payload.username} đã rời phòng`, createdAt: new Date().toISOString() },
        ]);
      },
      onRoomClosed: () => {
        if (!isMountedRef.current) return;
        setRoomClosed(true);
        setKeepRoomAlive(false);
        setRoomMinimized(false);
      },
      onVoiceState: (payload) => {
        if (!isMountedRef.current) return;
        handlersRef.current.onVoiceState?.(payload);
      },
      onVoiceError: (payload) => {
        if (!isMountedRef.current) return;
        handlersRef.current.onVoiceError?.(payload);
      },
      onError: (payload) => {
        if (!isMountedRef.current) return;
        // Chỉ log lỗi nếu không phải là lỗi "Not in a room" thông thường khi hết nhạc/rời phòng
        if (payload.message !== 'Not in a room') {
          console.error('[socket] room error', payload.message);
        }
        if (payload.message === 'Not in a room') {
          setJoinState('idle');
        }
      },
    };

    removeRoomListeners(socket);
    registerRoomListeners(socket, typedHandlers);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    if (!socket.connected) {
      socket.connect();
    } else {
      setIsConnected(true);
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      removeRoomListeners(socket);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [applyPlayback, doJoinRoom, isAuthenticated, setCurrentRoom, setKeepRoomAlive, setPermissions, setPlaybackState, setRoomMinimized, socket, user]);

  useEffect(() => {
    if (isConnected && currentRoom && joinState === 'idle') {
      doJoinRoom();
    }
  }, [currentRoom, doJoinRoom, isConnected, joinState]);

  useEffect(() => {
    return () => {
      if (currentRoomRef.current?._id) {
        emitLeaveRoom(socket);
      }
    };
  }, [socket]);

  return {
    currentRoom,
    isConnected,
    syncStatus,
    messages,
    chatMessages,
    latestSys,
    roomClosed,
    sendMessage: handleSendMessage,
    handleLeaveRoom,
    setRoomClosed,
    doJoinRoom,
  };
};
