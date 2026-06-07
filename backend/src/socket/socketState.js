const roomStates = new Map();
const socketToUser = new Map();
const userToSockets = new Map();
const syncIntervals = new Map();
const voiceStages = new Map(); // roomId -> { slot1: userId|null, slot2: userId|null, speaking: Set<userId> }

const getSongDuration = (song) => {
  if (!song || typeof song !== 'object') return null;
  const duration = Number(song.duration);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  return duration;
};

const getEffectivePlaybackState = (state) => {
  if (!state) {
    return {
      isPlaying: false,
      currentTime: 0,
      currentSong: null,
      lastUpdateTime: Date.now(),
      skipVotes: []
    };
  }

  let currentTime = Number(state.currentTime) || 0;
  if (state.isPlaying) {
    const elapsed = Math.max(0, (Date.now() - Number(state.lastUpdateTime || Date.now())) / 1000);
    currentTime += elapsed;
  }

  const duration = getSongDuration(state.currentSong);
  if (duration !== null) {
    currentTime = Math.min(currentTime, duration);
  }

  return {
    ...state,
    currentTime,
    lastUpdateTime: Date.now()
  };
};

const startPeriodicSync = (io, roomId) => {
  if (syncIntervals.has(roomId)) return;

  const interval = setInterval(() => {
    const state = roomStates.get(roomId);
    if (!state || !state.isPlaying) return;

    const effectiveState = getEffectivePlaybackState(state);
    roomStates.set(roomId, effectiveState);

    io.to(roomId).emit('playback_sync', {
      currentSong: effectiveState.currentSong,
      isPlaying: effectiveState.isPlaying,
      currentTime: effectiveState.currentTime,
      lastUpdateTime: effectiveState.lastUpdateTime
    });
  }, 1000);

  syncIntervals.set(roomId, interval);
};

const stopPeriodicSync = (roomId) => {
  if (syncIntervals.has(roomId)) {
    clearInterval(syncIntervals.get(roomId));
    syncIntervals.delete(roomId);
  }
};

const isUserAlreadyInRoomViaAnotherSocket = (socket, roomId) => {
  const userSockets = userToSockets.get(socket.user._id.toString());
  if (!userSockets || userSockets.size <= 1) return false;

  for (const socketId of userSockets) {
    if (socketId === socket.id) continue;
    const otherSocket = socket.server.sockets.sockets.get(socketId);
    if (otherSocket && otherSocket.rooms.has(roomId)) return true;
  }

  return false;
};

module.exports = {
  roomStates,
  voiceStages,
  socketToUser,
  userToSockets,
  syncIntervals,
  getEffectivePlaybackState,
  startPeriodicSync,
  stopPeriodicSync,
  isUserAlreadyInRoomViaAnotherSocket
};
