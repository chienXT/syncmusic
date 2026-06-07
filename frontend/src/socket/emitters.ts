import { Socket } from 'socket.io-client';
import { socketClientEvents } from './events';
import type { PlaybackState } from '@/types/socket';

export const emitJoinRoom = (socket: Socket, roomId: string) => {
  socket.emit(socketClientEvents.JOIN_ROOM, { roomId });
};

export const emitLeaveRoom = (socket: Socket) => {
  socket.emit(socketClientEvents.LEAVE_ROOM);
};

export const emitPlay = (socket: Socket, roomId: string, currentTime?: number) => {
  const payload: { roomId: string; currentTime?: number } = { roomId };
  if (typeof currentTime === 'number' && !Number.isNaN(currentTime)) {
    payload.currentTime = currentTime;
  }
  socket.emit(socketClientEvents.PLAY, payload);
};

export const emitPause = (socket: Socket, roomId: string, currentTime?: number) => {
  const payload: { roomId: string; currentTime?: number } = { roomId };
  if (typeof currentTime === 'number' && !Number.isNaN(currentTime)) {
    payload.currentTime = currentTime;
  }
  socket.emit(socketClientEvents.PAUSE, payload);
};

export const emitSeek = (socket: Socket, roomId: string, currentTime: number) => {
  socket.emit(socketClientEvents.SEEK, { roomId, currentTime });
};

export const emitSkip = (socket: Socket, roomId: string) => {
  socket.emit(socketClientEvents.SKIP, { roomId });
};

export const emitRequestSync = (socket: Socket, roomId: string) => {
  socket.emit(socketClientEvents.REQUEST_SYNC, { roomId });
};

export const emitAddToQueue = (socket: Socket, roomId: string, songId: string) => {
  socket.emit(socketClientEvents.ADD_TO_QUEUE, { roomId, songId });
};

export const emitRemoveFromQueue = (socket: Socket, roomId: string, songId: string) => {
  socket.emit(socketClientEvents.REMOVE_FROM_QUEUE, { roomId, songId });
};

export const emitUpdateQueueOrder = (socket: Socket, roomId: string, queue: Array<string>) => {
  socket.emit(socketClientEvents.UPDATE_QUEUE_ORDER, { roomId, queue });
};

export const emitSendMessage = (socket: Socket, roomId: string, content: string) => {
  socket.emit(socketClientEvents.SEND_MESSAGE, { roomId, content, type: 'text' });
};

export const emitTyping = (socket: Socket, roomId: string) => {
  socket.emit(socketClientEvents.USER_TYPING, { roomId });
};

export const emitStopTyping = (socket: Socket, roomId: string) => {
  socket.emit(socketClientEvents.STOP_TYPING, { roomId });
};

export const emitVoiceJoinSlot = (socket: Socket, roomId: string) => {
  socket.emit(socketClientEvents.VOICE_JOIN_SLOT as any, { roomId });
};

export const emitVoiceLeaveSlot = (socket: Socket, roomId: string) => {
  socket.emit(socketClientEvents.VOICE_LEAVE_SLOT as any, { roomId });
};

export const emitVoiceToggle = (socket: Socket, roomId: string, enabled: boolean) => {
  socket.emit(socketClientEvents.VOICE_TOGGLE as any, { roomId, enabled });
};

export const emitVoiceSignalJoin = (socket: Socket, roomId: string) => {
  socket.emit(socketClientEvents.VOICE_SIGNAL_JOIN as any, { roomId });
};

export const emitVoiceSignalLeave = (socket: Socket, roomId: string) => {
  socket.emit(socketClientEvents.VOICE_SIGNAL_LEAVE as any, { roomId });
};

export const emitVoiceWebRtcOffer = (socket: Socket, to: string, offer: RTCSessionDescriptionInit, roomId?: string) => {
  socket.emit(socketClientEvents.VOICE_WEBRTC_OFFER as any, { to, offer, roomId });
};

export const emitVoiceWebRtcAnswer = (socket: Socket, to: string, answer: RTCSessionDescriptionInit, roomId?: string) => {
  socket.emit(socketClientEvents.VOICE_WEBRTC_ANSWER as any, { to, answer, roomId });
};

export const emitVoiceWebRtcIce = (socket: Socket, to: string, candidate: RTCIceCandidateInit, roomId?: string) => {
  socket.emit(socketClientEvents.VOICE_WEBRTC_ICE as any, { to, candidate, roomId });
};
