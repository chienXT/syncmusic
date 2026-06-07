import type { Socket } from 'socket.io-client';
import { socketServerEvents } from './events';
import type {
  ChatMessagePayload,
  PlaybackState,
  SocketServerToClientEvents,
} from '@/types/socket';

export type RoomSocketHandlers = {
  onRoomState?: (payload: SocketServerToClientEvents['room_state']) => void;
  onRoomUpdated?: (payload: SocketServerToClientEvents['room_updated']) => void;
  onPlaybackSync?: (payload: PlaybackState) => void;
  onSongChanged?: (payload: SocketServerToClientEvents['song_changed']) => void;
  onSyncResponse?: (payload: PlaybackState) => void;
  onQueueUpdated?: (payload: SocketServerToClientEvents['queue_updated']) => void;
  onNewMessage?: (message: ChatMessagePayload) => void;
  onMessageSent?: (message: ChatMessagePayload) => void;
  onUserJoined?: (payload: SocketServerToClientEvents['user_joined']) => void;
  onUserLeft?: (payload: SocketServerToClientEvents['user_left']) => void;
  onRoomClosed?: (payload: SocketServerToClientEvents['room_closed']) => void;
  onVoiceState?: (payload: SocketServerToClientEvents['voice_state']) => void;
  onVoiceError?: (payload: SocketServerToClientEvents['voice_error']) => void;
  onVoicePeerJoined?: (payload: SocketServerToClientEvents['voice_peer_joined']) => void;
  onVoicePeerLeft?: (payload: SocketServerToClientEvents['voice_peer_left']) => void;
  onVoiceOffer?: (payload: SocketServerToClientEvents['voice_webrtc_offer']) => void;
  onVoiceAnswer?: (payload: SocketServerToClientEvents['voice_webrtc_answer']) => void;
  onVoiceIce?: (payload: SocketServerToClientEvents['voice_webrtc_ice']) => void;
  onError?: (payload: SocketServerToClientEvents['error']) => void;
};

export const registerRoomListeners = (socket: Socket, handlers: RoomSocketHandlers) => {
  if (handlers.onRoomState) {
    socket.on(socketServerEvents.ROOM_STATE, handlers.onRoomState);
  }
  if (handlers.onPlaybackSync) {
    socket.on(socketServerEvents.PLAYBACK_SYNC, handlers.onPlaybackSync);
  }
  if (handlers.onSongChanged) {
    socket.on(socketServerEvents.SONG_CHANGED, handlers.onSongChanged);
  }
  if (handlers.onSyncResponse) {
    socket.on(socketServerEvents.SYNC_RESPONSE, handlers.onSyncResponse);
  }
  if (handlers.onRoomUpdated) {
    socket.on(socketServerEvents.ROOM_UPDATED, handlers.onRoomUpdated);
  }
  if (handlers.onQueueUpdated) {
    socket.on(socketServerEvents.QUEUE_UPDATED, handlers.onQueueUpdated);
  }
  if (handlers.onNewMessage) {
    socket.on(socketServerEvents.NEW_MESSAGE, handlers.onNewMessage);
  }
  if (handlers.onMessageSent) {
    socket.on(socketServerEvents.MESSAGE_SENT, handlers.onMessageSent);
  }
  if (handlers.onUserJoined) {
    socket.on(socketServerEvents.USER_JOINED, handlers.onUserJoined);
  }
  if (handlers.onUserLeft) {
    socket.on(socketServerEvents.USER_LEFT, handlers.onUserLeft);
  }
  if (handlers.onRoomClosed) {
    socket.on(socketServerEvents.ROOM_CLOSED, handlers.onRoomClosed);
  }
  if (handlers.onVoiceState) {
    socket.on(socketServerEvents.VOICE_STATE, handlers.onVoiceState);
  }
  if (handlers.onVoiceError) {
    socket.on(socketServerEvents.VOICE_ERROR, handlers.onVoiceError);
  }
  if (handlers.onVoicePeerJoined) {
    socket.on(socketServerEvents.VOICE_PEER_JOINED, handlers.onVoicePeerJoined);
  }
  if (handlers.onVoicePeerLeft) {
    socket.on(socketServerEvents.VOICE_PEER_LEFT, handlers.onVoicePeerLeft);
  }
  if (handlers.onVoiceOffer) {
    socket.on(socketServerEvents.VOICE_WEBRTC_OFFER, handlers.onVoiceOffer);
  }
  if (handlers.onVoiceAnswer) {
    socket.on(socketServerEvents.VOICE_WEBRTC_ANSWER, handlers.onVoiceAnswer);
  }
  if (handlers.onVoiceIce) {
    socket.on(socketServerEvents.VOICE_WEBRTC_ICE, handlers.onVoiceIce);
  }
  if (handlers.onError) {
    socket.on(socketServerEvents.ERROR, handlers.onError);
  }
};

export const removeRoomListeners = (socket: Socket) => {
  [
    socketServerEvents.ROOM_STATE,
    socketServerEvents.PLAYBACK_SYNC,
    socketServerEvents.SONG_CHANGED,
    socketServerEvents.SYNC_RESPONSE,
    socketServerEvents.ROOM_UPDATED,
    socketServerEvents.QUEUE_UPDATED,
    socketServerEvents.NEW_MESSAGE,
    socketServerEvents.MESSAGE_SENT,
    socketServerEvents.USER_JOINED,
    socketServerEvents.USER_LEFT,
    socketServerEvents.ROOM_CLOSED,
    socketServerEvents.VOICE_STATE,
    socketServerEvents.VOICE_ERROR,
    socketServerEvents.ERROR,
  ].forEach((event) => socket.off(event));
};
