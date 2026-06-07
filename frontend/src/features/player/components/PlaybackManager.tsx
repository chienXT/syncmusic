'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useRoomStore } from '@/store/roomStore';
import { usePlayerStore } from '@/store/playerStore';
import { getSocket } from '@/lib/socket';
import { emitSkip } from '@/socket/emitters';
import { useYouTubeSync } from '@/features/player/hooks/useYouTubeSync';

export default function PlaybackManager() {
  const pathname = usePathname();
  const currentRoom = useRoomStore((state) => state.currentRoom);
  const isRoomMinimized = useRoomStore((state) => state.isRoomMinimized);
  const keepRoomAlive = useRoomStore((state) => state.keepRoomAlive);
  const currentSong = usePlayerStore((state) => state.currentSong);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const volume = usePlayerStore((state) => state.volume);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
  const user = useAuthStore((state) => state.user);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);

  const isHost = currentRoom?.host?._id?.toString() === user?._id?.toString();
  const isModerator = Boolean(
    currentRoom?.moderators?.some((m: any) => (m?._id?.toString?.() || m?.toString()) === user?._id?.toString())
  );
  const canControlPlayback = Boolean(isHost || isModerator);
  const isOnRoomPage = pathname.startsWith('/room/');
  const isActive = Boolean(currentRoom && (isRoomMinimized || keepRoomAlive || isOnRoomPage));
  const managedSong = isActive ? currentSong : null;
  const isYoutube = managedSong?.source === 'youtube';

  const handleEnded = useCallback(() => {
    if (canControlPlayback && currentRoom?._id) {
      emitSkip(getSocket(), currentRoom._id);
    } else {
      setIsPlaying(false);
    }
  }, [canControlPlayback, currentRoom?._id, setIsPlaying]);

  const { ytContainerRef } = useYouTubeSync(
    managedSong,
    currentTime,
    isPlaying,
    volume,
    setCurrentTime,
    setIsPlaying,
    handleEnded,
  );

  const tryPlayAudio = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      await audioRef.current.play();
      setNeedsUserInteraction(false);
    } catch {
      setNeedsUserInteraction(true);
    }
  }, []);

  useEffect(() => {
    if (!isActive || isYoutube || !audioRef.current) return;

    const audio = audioRef.current;

    if (isPlaying) {
      void tryPlayAudio();
    } else {
      audio.pause();
    }
  }, [isActive, isPlaying, isYoutube, managedSong?.audioUrl, tryPlayAudio]);

  useEffect(() => {
    if (!isActive || isYoutube || !audioRef.current) return;

    const audio = audioRef.current;
    if (Math.abs(audio.currentTime - currentTime) > 1) {
      audio.currentTime = Math.max(0, currentTime);
    }
  }, [isActive, currentTime, isYoutube]);

  useEffect(() => {
    if (!isActive || isYoutube || !audioRef.current) return;
    audioRef.current.volume = Math.max(0, Math.min(1, volume / 100));
  }, [isActive, volume, isYoutube]);

  useEffect(() => {
    if (!isActive || isYoutube || !audioRef.current) return;

    const audio = audioRef.current;
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [isActive, isYoutube, managedSong?.audioUrl, setCurrentTime]);

  const handleUnlock = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      gain.gain.value = 0;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.01);
      await audioContext.resume();
      await tryPlayAudio();
    } catch {
      setNeedsUserInteraction(true);
    }
  }, [tryPlayAudio]);

  useEffect(() => {
    const unlockOnFirstGesture = () => {
      void handleUnlock();
    };

    if (needsUserInteraction) {
      window.addEventListener('pointerdown', unlockOnFirstGesture, { once: true });
      window.addEventListener('touchstart', unlockOnFirstGesture, { once: true });
    }

    return () => {
      window.removeEventListener('pointerdown', unlockOnFirstGesture);
      window.removeEventListener('touchstart', unlockOnFirstGesture);
    };
  }, [handleUnlock, needsUserInteraction]);

  useEffect(() => {
    window.addEventListener('syncmusic-unlock-audio', handleUnlock);
    return () => window.removeEventListener('syncmusic-unlock-audio', handleUnlock);
  }, [handleUnlock]);

  if (!currentRoom || !isActive) return null;

  return (
    <>
      {managedSong?.source !== 'youtube' && managedSong?.audioUrl && (
        <audio
          ref={audioRef}
          src={managedSong.audioUrl}
          preload="auto"
          onEnded={handleEnded}
          playsInline
        />
      )}

      {managedSong?.source === 'youtube' && managedSong.sourceId && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: '-99999px',
            top: '-99999px',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <div ref={ytContainerRef} style={{ width: '1px', height: '1px', overflow: 'hidden' }} />
        </div>
      )}

      {needsUserInteraction && (
        <button
          type="button"
          onClick={handleUnlock}
          style={{
            position: 'fixed',
            left: '50%',
            bottom: '1rem',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '0.75rem 1rem',
            borderRadius: '999px',
            border: 'none',
            background: 'rgba(15, 23, 42, 0.92)',
            color: 'white',
            boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
          }}
        >
          Bấm để bật âm thanh
        </button>
      )}
    </>
  );
}
