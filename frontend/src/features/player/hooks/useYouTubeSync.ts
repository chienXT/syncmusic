import { useEffect, useRef } from 'react';
import type { Song } from '@/types/song';

export const useYouTubeSync = (
  currentSong: Song | null,
  currentTime: number,
  isPlaying: boolean,
  volume: number,
  setCurrentTime: (time: number) => void,
  _setIsPlaying: (playing: boolean) => void,
  onSkip: () => void,
) => {
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytEndedRef = useRef(false);
  const isPlayerReadyRef = useRef(false);
  const lastLoadedVideoIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  const volumeRef = useRef(volume);
  const isPlayingRef = useRef(isPlaying);
  const currentTimeRef = useRef(currentTime);
  const onSkipRef = useRef(onSkip);
  const setCurrentTimeRef = useRef(setCurrentTime);

  const resetYouTubePlayerState = () => {
    ytPlayerRef.current = null;
    isPlayerReadyRef.current = false;
    ytEndedRef.current = false;
    lastLoadedVideoIdRef.current = null;
  };

  const destroyYouTubePlayer = () => {
    const player = ytPlayerRef.current;

    if (!player) {
      resetYouTubePlayerState();
      return;
    }

    try {
      player.stopVideo?.();
    } catch {
      // ignore YouTube iframe errors
    }

    try {
      const iframe = player.getIframe?.();
      const hasMountedIframe = Boolean(iframe?.parentNode);

      if (hasMountedIframe) {
        player.destroy?.();
      }
    } catch {
      // ignore YouTube iframe errors
    }

    resetYouTubePlayerState();
  };

  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { onSkipRef.current = onSkip; }, [onSkip]);
  useEffect(() => { setCurrentTimeRef.current = setCurrentTime; }, [setCurrentTime]);

  const currentSource = currentSong?.source;
  const currentSourceId = currentSong?.sourceId;

  useEffect(() => {
    if (currentSource !== 'youtube' || !currentSourceId) return;
    if (lastLoadedVideoIdRef.current === currentSourceId) return;

    // A new YouTube track must start from the beginning. Without this reset,
    // the iframe can reuse the previous song's time and appear to not switch.
    currentTimeRef.current = 0;
    ytEndedRef.current = false;
  }, [currentSource, currentSourceId]);

  useEffect(() => {
    if (currentSource !== 'youtube' || !currentSourceId) return;

    const videoId = currentSourceId;

    const createPlayer = () => {
      if (!isMountedRef.current || !(window as any).YT || !ytContainerRef.current) return;

      try {
        const player = ytPlayerRef.current;
        const playerIframe = player?.getIframe?.();

        if (player && !playerIframe?.parentNode) {
          resetYouTubePlayerState();
        }

        const activePlayer = ytPlayerRef.current;

        if (activePlayer?.loadVideoById || activePlayer?.cueVideoById) {
          if (lastLoadedVideoIdRef.current === videoId) return;

          const startSeconds = 0;
          lastLoadedVideoIdRef.current = videoId;
          currentTimeRef.current = 0;
          ytEndedRef.current = false;

          if (isPlayingRef.current) {
            activePlayer.loadVideoById({ videoId, startSeconds });
          } else {
            activePlayer.cueVideoById({ videoId, startSeconds });
          }
          return;
        }

        ytPlayerRef.current = new (window as any).YT.Player(ytContainerRef.current, {
          height: '100%',
          width: '100%',
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            fs: 0,
            disablekb: 1,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              if (!isMountedRef.current) return;

              isPlayerReadyRef.current = true;
              lastLoadedVideoIdRef.current = videoId;
              ytEndedRef.current = false;

              try {
                event.target.setVolume?.(volumeRef.current);
                event.target.seekTo?.(0, true);

                if (isPlayingRef.current) event.target.playVideo?.();
                else event.target.pauseVideo?.();
              } catch {
                // ignore YouTube iframe errors
              }
            },
            onStateChange: (event: any) => {
              if (!isMountedRef.current) return;

              const YT = (window as any).YT;
              if (!YT?.PlayerState) return;

              if (event.data === YT.PlayerState.PLAYING) {
                ytEndedRef.current = false;
              }

              if (event.data === YT.PlayerState.ENDED && !ytEndedRef.current) {
                ytEndedRef.current = true;
                onSkipRef.current();
              }
            },
          },
        });
      } catch {
        ytPlayerRef.current = null;
        isPlayerReadyRef.current = false;
      }
    };

    if (!(window as any).YT) {
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      }
      (window as any).onYouTubeIframeAPIReady = createPlayer;
    } else {
      createPlayer();
    }

    return () => {
      if ((window as any).onYouTubeIframeAPIReady === createPlayer) {
        (window as any).onYouTubeIframeAPIReady = undefined;
      }
    };
  }, [currentSourceId, currentSource]);

  useEffect(() => {
    if (currentSource !== 'youtube' || !currentSourceId) return;

    const interval = window.setInterval(() => {
      const player = ytPlayerRef.current;
      const YT = (window as any).YT;

      if (!player?.getCurrentTime || !player?.getPlayerState || !YT?.PlayerState) return;

      try {
        const playerState = player.getPlayerState();

        if (playerState === YT.PlayerState.PLAYING || playerState === YT.PlayerState.PAUSED) {
          const nextTime = player.getCurrentTime();
          const duration = Number(player.getDuration?.() || 0);
          setCurrentTimeRef.current(nextTime);

          // YouTube iframe đôi lúc không phát sự kiện ENDED ổn định khi player bị ẩn.
          // Nếu thời gian đã chạm sát cuối bài thì chủ động chuyển bài để tránh kẹt.
          if (
            duration > 0 &&
            nextTime >= duration - 0.75 &&
            playerState === YT.PlayerState.PLAYING &&
            !ytEndedRef.current
          ) {
            ytEndedRef.current = true;
            onSkipRef.current();
          }
        }

        if (playerState === YT.PlayerState.ENDED && !ytEndedRef.current) {
          ytEndedRef.current = true;
          onSkipRef.current();
        }
      } catch {
        // ignore YouTube iframe errors
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [currentSource, currentSourceId]);

  useEffect(() => {
    if (currentSource !== 'youtube' || !currentSourceId) return;

    const player = ytPlayerRef.current;
    if (!player || !isPlayerReadyRef.current) return;

    try {
      if (isPlaying) player.playVideo?.();
      else player.pauseVideo?.();
    } catch {
      // ignore YouTube iframe errors
    }
  }, [isPlaying, currentSource, currentSourceId]);

  useEffect(() => {
    if (currentSource !== 'youtube' || !currentSourceId) return;

    const player = ytPlayerRef.current;
    if (!player?.getCurrentTime || !player?.seekTo || !isPlayerReadyRef.current) return;

    try {
      const playerTime = player.getCurrentTime();
      if (Math.abs(playerTime - currentTime) > 1.25) {
        player.seekTo(Math.max(0, currentTime), true);
      }
    } catch {
      // ignore YouTube iframe errors
    }
  }, [currentTime, currentSource, currentSourceId]);

  useEffect(() => {
    const player = ytPlayerRef.current;
    if (!player?.setVolume) return;

    try {
      player.setVolume(volume);
    } catch {
      // ignore YouTube iframe errors
    }
  }, [volume]);

  useEffect(() => {
    if (currentSource === 'youtube') return;

    destroyYouTubePlayer();
  }, [currentSource]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      destroyYouTubePlayer();

      if ((window as any).onYouTubeIframeAPIReady) {
        (window as any).onYouTubeIframeAPIReady = undefined;
      }
    };
  }, []);

  return {
    ytContainerRef,
    ytPlayerRef,
  };
};
