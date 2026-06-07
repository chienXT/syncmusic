import type { Socket } from 'socket.io-client';
import type { Song } from '@/types/song';
import { emitPause, emitPlay, emitSeek } from '@/socket/emitters';

export type PlaybackConfig = {
  roomId: string;
  playMode: 'live' | 'free';
  canControlPlay: boolean;
  currentSong: Song | null;
  currentTime: number;
  isPlaying: boolean;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  socket: Socket | null;
};

export const usePlayback = ({
  roomId,
  playMode,
  canControlPlay,
  currentSong,
  currentTime,
  isPlaying,
  setCurrentTime,
  setIsPlaying,
  socket,
}: PlaybackConfig) => {
  const handlePlayPause = () => {
    if (!currentSong) return;

    const nextState = !isPlaying;

    if (playMode === 'live') {
      if (!canControlPlay || !socket || !roomId) return;

      setIsPlaying(nextState);

      if (nextState) {
        emitPlay(socket, roomId, currentTime);
      } else {
        emitPause(socket, roomId, currentTime);
      }

      return;
    }

    setIsPlaying(nextState);
  };

  const handleSeek = (time: number) => {
    if (!currentSong) return;

    const nextTime = Math.max(0, time);
    setCurrentTime(nextTime);

    if (playMode === 'live') {
      if (!canControlPlay || !socket || !roomId) return;
      emitSeek(socket, roomId, nextTime);
    }
  };

  return {
    handlePlayPause,
    handleSeek,
  };
};