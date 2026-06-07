import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import {
  emitVoiceSignalJoin,
  emitVoiceSignalLeave,
  emitVoiceWebRtcAnswer,
  emitVoiceWebRtcIce,
  emitVoiceWebRtcOffer,
} from '@/socket/emitters';
import { socketServerEvents } from '@/socket/events';
import type { VoicePeerPayload, WebRtcAnswerPayload, WebRtcIcePayload, WebRtcOfferPayload } from '@/types/socket';

const DEFAULT_STUN = [{ urls: 'stun:stun.l.google.com:19302' }];
const VOICE_DEBUG = process.env.NODE_ENV !== 'production';

const logVoice = (...args: unknown[]) => {
  if (VOICE_DEBUG) console.log('[voice-webrtc]', ...args);
};

type UseVoiceChatArgs = {
  roomId: string;
  active: boolean;
  isInVoiceStage: boolean;
};

export const useVoiceChat = ({ roomId, active, isInVoiceStage }: UseVoiceChatArgs) => {
  const socket = getSocket();
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [remotePeers, setRemotePeers] = useState<Record<string, VoicePeerPayload>>({});
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [remoteAudioBlocked, setRemoteAudioBlocked] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudioRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const analyserCleanupRef = useRef<(() => void) | null>(null);

  const unlockRemoteAudio = useCallback(async () => {
    const playResults = Array.from(remoteAudioRef.current.values()).map(async (audio) => {
      audio.muted = false;
      audio.volume = 1;
      await audio.play();
    });

    try {
      await Promise.all(playResults);
      setRemoteAudioBlocked(false);
    } catch (error) {
      logVoice('remote audio still blocked', error);
      setRemoteAudioBlocked(true);
    }
  }, []);

  const cleanupPeer = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
    }
    const audio = remoteAudioRef.current.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      remoteAudioRef.current.delete(peerId);
    }
    setRemotePeers((current) => {
      const next = { ...current };
      delete next[peerId];
      return next;
    });
  }, []);

  const startAnalyser = useCallback((stream: MediaStream) => {
    analyserCleanupRef.current?.();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioCtx();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    let raf = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const level = Math.min(1, rms * 8);
      frame += 1;
      if (frame % 3 === 0) {
        setVoiceLevel(level);
        setIsVoiceActive(level > 0.12);
      }
      raf = window.requestAnimationFrame(tick);
    };

    tick();
    analyserCleanupRef.current = () => {
      window.cancelAnimationFrame(raf);
      source.disconnect();
      void audioContext.close().catch(() => undefined);
      setVoiceLevel(0);
      setIsVoiceActive(false);
    };
  }, []);

  const stopLocalStream = useCallback(() => {
    analyserCleanupRef.current?.();
    analyserCleanupRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  }, []);

  const leaveVoice = useCallback(() => {
    emitVoiceSignalLeave(socket, roomId);
    setIsMicEnabled(false);
    setIsRequestingMic(false);
    stopLocalStream();
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    remoteAudioRef.current.forEach((audio) => {
      audio.srcObject = null;
      audio.remove();
    });
    remoteAudioRef.current.clear();
    setRemotePeers({});
    setRemoteAudioBlocked(false);
  }, [roomId, socket, stopLocalStream]);

  const attachRemoteTrack = useCallback((peerId: string, event: RTCTrackEvent) => {
    let audio = remoteAudioRef.current.get(peerId);
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.playsInline = true;
      audio.controls = false;
      audio.muted = false;
      audio.volume = 1;
      audio.dataset.peerId = peerId;
      audio.style.display = 'none';
      remoteAudioRef.current.set(peerId, audio);
      document.body.appendChild(audio);
    }
    const [stream] = event.streams;
    logVoice('remote track received', { peerId, streams: event.streams.length });
    if (stream) {
      audio.srcObject = stream;
      void audio.play()
        .then(() => setRemoteAudioBlocked(false))
        .catch((error) => {
          logVoice('remote audio autoplay blocked', error);
          setRemoteAudioBlocked(true);
        });
    }
  }, []);

  const ensurePeerConnection = useCallback((peerId: string) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)!;

    const pc = new RTCPeerConnection({ iceServers: DEFAULT_STUN });
    peersRef.current.set(peerId, pc);
    logVoice('create peer connection', { peerId, self: socket.id });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        emitVoiceWebRtcIce(socket, peerId, event.candidate.toJSON(), roomId);
      }
    };

    pc.ontrack = (event) => {
      attachRemoteTrack(peerId, event);
    };

    pc.oniceconnectionstatechange = () => {
      logVoice('ice state', { peerId, state: pc.iceConnectionState });
    };

    pc.onconnectionstatechange = () => {
      logVoice('connection state', { peerId, state: pc.connectionState });
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupPeer(peerId);
      }
    };

    const localStream = localStreamRef.current;
    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    return pc;
  }, [attachRemoteTrack, cleanupPeer, roomId, socket]);

  const startMic = useCallback(async () => {
    setPermissionError(null);
    setIsRequestingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      startAnalyser(stream);
      setIsMicEnabled(true);
      logVoice('mic started, signal join', { roomId, socketId: socket.id });
      emitVoiceSignalJoin(socket, roomId);
    } catch (error: any) {
      setPermissionError(error?.message || 'Không thể truy cập microphone');
      setIsMicEnabled(false);
    } finally {
      setIsRequestingMic(false);
    }
  }, [roomId, socket, startAnalyser]);

  const stopMic = useCallback(() => {
    leaveVoice();
  }, [leaveVoice]);

  const handlePeerJoined = useCallback(async (payload: VoicePeerPayload) => {
    logVoice('peer joined event', payload, { self: socket.id, isInVoiceStage, active });
    if (!isInVoiceStage || !active) return;
    if (payload.peerId === socket.id) return;
    setRemotePeers((current) => ({ ...current, [payload.peerId]: payload }));

    try {
      const pc = ensurePeerConnection(payload.peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      emitVoiceWebRtcOffer(socket, payload.peerId, offer, roomId);
      logVoice('offer sent', { to: payload.peerId });
    } catch (error) {
      logVoice('create offer failed', error);
    }
  }, [active, ensurePeerConnection, isInVoiceStage, roomId, socket]);

  const handleOffer = useCallback(async (payload: WebRtcOfferPayload) => {
    logVoice('offer received', payload, { self: socket.id });
    if (payload.to !== socket.id) return;
    try {
      const pc = ensurePeerConnection(payload.from);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      emitVoiceWebRtcAnswer(socket, payload.from, answer, roomId);
      setRemotePeers((current) => ({ ...current, [payload.from]: { peerId: payload.from, userId: payload.userId, username: payload.username } }));
      logVoice('answer sent', { to: payload.from });
    } catch (error) {
      logVoice('handle offer failed', error);
    }
  }, [ensurePeerConnection, roomId, socket]);

  const handleAnswer = useCallback(async (payload: WebRtcAnswerPayload) => {
    logVoice('answer received', payload, { self: socket.id });
    if (payload.to !== socket.id) return;
    const pc = peersRef.current.get(payload.from);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
    } catch (error) {
      logVoice('handle answer failed', error);
    }
  }, [socket.id]);

  const handleIce = useCallback(async (payload: WebRtcIcePayload) => {
    if (payload.to !== socket.id) return;
    const pc = peersRef.current.get(payload.from);
    if (!pc || !payload.candidate) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch (error) {
      logVoice('add ice failed', error);
    }
  }, [socket.id]);

  useEffect(() => {
    const onPeerJoined = (payload: VoicePeerPayload) => { void handlePeerJoined(payload); };
    const onPeerLeft = (payload: VoicePeerPayload) => cleanupPeer(payload.peerId);
    const onOffer = (payload: WebRtcOfferPayload) => { void handleOffer(payload); };
    const onAnswer = (payload: WebRtcAnswerPayload) => { void handleAnswer(payload); };
    const onIce = (payload: WebRtcIcePayload) => { void handleIce(payload); };

    socket.on(socketServerEvents.VOICE_PEER_JOINED, onPeerJoined);
    socket.on(socketServerEvents.VOICE_PEER_LEFT, onPeerLeft);
    socket.on(socketServerEvents.VOICE_WEBRTC_OFFER, onOffer);
    socket.on(socketServerEvents.VOICE_WEBRTC_ANSWER, onAnswer);
    socket.on(socketServerEvents.VOICE_WEBRTC_ICE, onIce);

    return () => {
      socket.off(socketServerEvents.VOICE_PEER_JOINED, onPeerJoined);
      socket.off(socketServerEvents.VOICE_PEER_LEFT, onPeerLeft);
      socket.off(socketServerEvents.VOICE_WEBRTC_OFFER, onOffer);
      socket.off(socketServerEvents.VOICE_WEBRTC_ANSWER, onAnswer);
      socket.off(socketServerEvents.VOICE_WEBRTC_ICE, onIce);
    };
  }, [cleanupPeer, handleAnswer, handleIce, handleOffer, handlePeerJoined, socket]);

  useEffect(() => {
    return () => {
      stopMic();
      remoteAudioRef.current.forEach((audio) => {
        audio.srcObject = null;
        audio.remove();
      });
      remoteAudioRef.current.clear();
    };
  }, [stopMic]);

  return {
    isRequestingMic,
    isMicEnabled,
    permissionError,
    remotePeers,
    voiceLevel,
    isVoiceActive,
    remoteAudioBlocked,
    unlockRemoteAudio,
    startMic,
    stopMic,
    leaveVoice,
  };
};
