import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Song } from '@/types/song';

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  queue: Song[];
  queueIndex: number;

  // Actions
  setCurrentSong: (song: Song | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  setQueue: (queue: Song[]) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  playSongAt: (index: number) => void;
  seekTo: (time: number) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
      volume: 100,
      queue: [],
      queueIndex: -1,

      setCurrentSong: (song) => set({ currentSong: song }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setVolume: (volume) => set({ volume }),
      setQueue: (queue) =>
        set({
          queue,
          queueIndex: queue.length > 0 ? 0 : -1,
        }),

      addToQueue: (song) =>
        set((state) => ({
          queue: [...state.queue, song],
          queueIndex: state.queueIndex === -1 ? 0 : state.queueIndex,
        })),

      removeFromQueue: (index) =>
        set((state) => {
          const newQueue = state.queue.filter((_, i) => i !== index);
          const newIndex =
            state.queueIndex > index ? state.queueIndex - 1 : state.queueIndex;

          return {
            queue: newQueue,
            queueIndex: newIndex >= newQueue.length ? -1 : newIndex,
          };
        }),

      playNext: () =>
        set((state) => {
          if (state.queueIndex < state.queue.length - 1) {
            return {
              queueIndex: state.queueIndex + 1,
              currentSong: state.queue[state.queueIndex + 1],
              currentTime: 0,
              isPlaying: true,
            };
          }

          return {
            isPlaying: false,
          };
        }),

      playPrevious: () =>
        set((state) => {
          if (state.currentTime > 3) {
            return {
              currentTime: 0,
            };
          }

          if (state.queueIndex > 0) {
            return {
              queueIndex: state.queueIndex - 1,
              currentSong: state.queue[state.queueIndex - 1],
              currentTime: 0,
              isPlaying: true,
            };
          }

          return {
            currentTime: 0,
          };
        }),

      playSongAt: (index) =>
        set((state) => {
          const song = state.queue[index];
          if (!song) return {};

          const currentId = state.currentSong?._id || state.currentSong?.sourceId;
          const nextId = song._id || song.sourceId;

          if (currentId && nextId && currentId === nextId) {
            return {
              queueIndex: index,
            };
          }

          return {
            queueIndex: index,
            currentSong: song,
            currentTime: 0,
            isPlaying: true,
          };
        }),

      seekTo: (time) => set({ currentTime: time }),

      reset: () =>
        set({
          currentSong: null,
          isPlaying: false,
          currentTime: 0,
          queue: [],
          queueIndex: -1,
        }),
    }),
    {
      name: 'player-store',
      partialize: (state) => ({
        currentSong: state.currentSong,
        currentTime: state.currentTime,
        volume: state.volume,
        queue: state.queue,
        queueIndex: state.queueIndex,
      }),
    }
  )
);
