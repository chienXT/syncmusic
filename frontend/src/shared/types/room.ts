import type { Song } from '@/types/song';

export interface Participant {
  user: {
    _id: string;
    username: string;
    avatar?: string;
    status?: string;
  };
  joinedAt?: string;
}

export interface RoomSettings {
  allowSkip: boolean;
  voteSkipThreshold: number;
  allowQueue: boolean;
  autoPlay: boolean;
}

export interface RoomPlayback {
  isPlaying: boolean;
  currentSong: Song | null;
  currentTime: number;
  lastUpdateTime: number | string;
  volume?: number;
}

export interface Room {
  _id: string;
  roomKey?: string;
  name: string;
  description?: string;
  inviteCode: string;
  host: {
    _id: string;
    username: string;
    avatar?: string;
  };
  moderators: Array<{ _id: string; username?: string; avatar?: string }>;
  participants: Participant[];
  isPrivate: boolean;
  isActive: boolean;
  maxParticipants: number;
  playback: RoomPlayback;
  queue: Song[];
  settings: RoomSettings;
  tags?: string[];
  stats?: {
    totalListeners?: number;
    songsPlayed?: number;
    totalListenTime?: number;
  };
}
