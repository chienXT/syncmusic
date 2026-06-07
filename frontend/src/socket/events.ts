import { SocketClientToServerEvents, SocketServerToClientEvents } from '@/types/socket';

export const socketClientEvents = {
  JOIN_ROOM: 'join_room' as const,
  LEAVE_ROOM: 'leave_room' as const,
  SEND_MESSAGE: 'send_message' as const,
  PLAY: 'play' as const,
  PAUSE: 'pause' as const,
  SEEK: 'seek' as const,
  SKIP: 'skip' as const,
  REQUEST_SYNC: 'sync_request' as const,
  ADD_TO_QUEUE: 'add_to_queue' as const,
  REMOVE_FROM_QUEUE: 'remove_from_queue' as const,
  UPDATE_QUEUE_ORDER: 'update_queue_order' as const,
  USER_TYPING: 'user_typing' as const,
  STOP_TYPING: 'stop_typing' as const,
  VOICE_JOIN_SLOT: 'voice_join_slot' as const,
  VOICE_LEAVE_SLOT: 'voice_leave_slot' as const,
  VOICE_TOGGLE: 'voice_toggle' as const,
  VOICE_SIGNAL_JOIN: 'voice_signal_join' as const,
  VOICE_SIGNAL_LEAVE: 'voice_signal_leave' as const,
  VOICE_WEBRTC_OFFER: 'voice_webrtc_offer' as const,
  VOICE_WEBRTC_ANSWER: 'voice_webrtc_answer' as const,
  VOICE_WEBRTC_ICE: 'voice_webrtc_ice' as const,
};

export const socketServerEvents = {
  ROOM_STATE: 'room_state' as const,
  ROOM_UPDATED: 'room_updated' as const,
  PLAYBACK_SYNC: 'playback_sync' as const,
  SONG_CHANGED: 'song_changed' as const,
  SYNC_RESPONSE: 'sync_response' as const,
  ROOM_CLOSED: 'room_closed' as const,
  USER_JOINED: 'user_joined' as const,
  USER_LEFT: 'user_left' as const,
  NEW_MESSAGE: 'new_message' as const,
  MESSAGE_SENT: 'message_sent' as const,
  QUEUE_UPDATED: 'queue_updated' as const,
  VOICE_STATE: 'voice_state' as const,
  VOICE_ERROR: 'voice_error' as const,
  VOICE_USER_JOINED: 'voice_user_joined' as const,
  VOICE_USER_LEFT: 'voice_user_left' as const,
  VOICE_SPEAKING_START: 'voice_speaking_start' as const,
  VOICE_SPEAKING_STOP: 'voice_speaking_stop' as const,
  VOICE_PEER_JOINED: 'voice_peer_joined' as const,
  VOICE_PEER_LEFT: 'voice_peer_left' as const,
  VOICE_WEBRTC_OFFER: 'voice_webrtc_offer' as const,
  VOICE_WEBRTC_ANSWER: 'voice_webrtc_answer' as const,
  VOICE_WEBRTC_ICE: 'voice_webrtc_ice' as const,
  ERROR: 'error' as const,
};

export type ClientEvents = typeof socketClientEvents[keyof typeof socketClientEvents];
export type ServerEvents = typeof socketServerEvents[keyof typeof socketServerEvents];

export type SocketEvents = {
  client: SocketClientToServerEvents;
  server: SocketServerToClientEvents;
};
