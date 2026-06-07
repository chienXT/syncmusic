export type PlaybackState = {
  isPlaying: boolean;
  currentTime: number;
  currentSongId?: string;
  currentSong?: {
    _id: string;
    title: string;
    artist?: string;
    duration?: number;
    coverArt?: string;
    source?: string;
  } | null;
  queue?: Array<{ _id: string; title: string; artist?: string; duration?: number; coverArt?: string }>;
  lastUpdateTime?: number;
};

export type RoomStatePayload = {
  roomId: string;
  roomName: string;
  isActive: boolean;
  hostId: string;
  hostUsername: string;
  participants: Array<{ userId: string; username: string; avatar?: string; role?: string }>;
  playback: PlaybackState;
  queue: Array<{ _id: string; title: string; artist?: string; duration?: number; coverArt?: string }>;
};

export type ChatMessagePayload = {
  _id: string;
  roomId: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  type: 'text' | 'system' | 'notification';
  createdAt: string;
};

export type VoiceStatePayload = {
  roomId: string;
  slots: { slot1: string | null; slot2: string | null };
  speaking: string[];
};

export type WebRtcOfferPayload = {
  from: string;
  to: string;
  offer: RTCSessionDescriptionInit;
  userId: string;
  username: string;
  roomId?: string;
};

export type WebRtcAnswerPayload = {
  from: string;
  to: string;
  answer: RTCSessionDescriptionInit;
  userId: string;
  username: string;
  roomId?: string;
};

export type WebRtcIcePayload = {
  from: string;
  to: string;
  candidate: RTCIceCandidateInit;
  userId: string;
  username: string;
  roomId?: string;
};

export type VoicePeerPayload = {
  peerId: string;
  userId: string;
  username: string;
};

export type SocketClientToServerEvents = {
  join_room: { roomId: string };
  leave_room: void;
  send_message: { roomId: string; content: string; type?: 'text' | 'system' };
  play: { roomId: string; currentTime: number };
  pause: { roomId: string; currentTime: number };
  seek: { roomId: string; currentTime: number };
  skip: { roomId: string };
  request_sync: { roomId: string };
  add_to_queue: { roomId: string; songId: string };
  remove_from_queue: { roomId: string; songId: string };
  update_queue_order: { roomId: string; queue: Array<string> };
  user_typing: { roomId: string };
  stop_typing: { roomId: string };
  voice_join_slot: { roomId: string };
  voice_leave_slot: { roomId: string };
  voice_toggle: { roomId: string; enabled: boolean };
  voice_signal_join: { roomId: string };
  voice_signal_leave: { roomId: string };
  voice_webrtc_offer: { roomId?: string; to: string; offer: RTCSessionDescriptionInit };
  voice_webrtc_answer: { roomId?: string; to: string; answer: RTCSessionDescriptionInit };
  voice_webrtc_ice: { roomId?: string; to: string; candidate: RTCIceCandidateInit };
};

export type SocketServerToClientEvents = {
  room_state: {
    room: RoomStatePayload;
    playback?: PlaybackState;
    isHost: boolean;
    isModerator?: boolean;
    messages?: ChatMessagePayload[];
  };
  room_updated: {
    room: RoomStatePayload;
  };
  playback_sync: PlaybackState;
  song_changed: { song?: any; currentTime: number; isPlaying?: boolean; userId?: string; timestamp?: number };
  sync_response: PlaybackState;
  room_closed: { roomId: string };
  user_joined: { userId: string; username: string; avatar?: string };
  user_left: { userId: string; username: string };
  new_message: ChatMessagePayload;
  message_sent: ChatMessagePayload;
  queue_updated: { roomId: string; queue: Array<{ _id: string; title: string; artist?: string; duration?: number; coverArt?: string }> };
  voice_state: VoiceStatePayload;
  voice_error: { message: string };
  voice_user_joined: { userId: string; username: string; slot: 'slot1' | 'slot2' };
  voice_user_left: { userId: string; username: string };
  voice_speaking_start: { userId: string; username: string };
  voice_speaking_stop: { userId: string; username: string };
  voice_peer_joined: VoicePeerPayload;
  voice_peer_left: VoicePeerPayload;
  voice_webrtc_offer: WebRtcOfferPayload;
  voice_webrtc_answer: WebRtcAnswerPayload;
  voice_webrtc_ice: WebRtcIcePayload;
  error: { message: string };
};
