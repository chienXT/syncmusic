const mongoose = require('mongoose');
const Room = require('../../models/Room');
const Song = require('../../models/Song');
const User = require('../../models/User');
const RoomHistory = require('../../models/RoomHistory');
const logger = require('../../utils/logger');
const {
  roomStates,
  getEffectivePlaybackState,
  startPeriodicSync,
  stopPeriodicSync
} = require('../socketState');
const {
  PLAY,
  PAUSE,
  SEEK,
  SKIP,
  PLAY_SONG,
  VOTE_SKIP,
  PLAYBACK_SYNC,
  SONG_CHANGED,
  PLAYBACK_ENDED,
  VOTE_UPDATE,
  ROOM_UPDATED
} = require('../../shared/constants/socketEvents');

const registerPlaybackHandlers = (io, socket) => {
  socket.on(PLAY, async (data) => {
    try {
      await handlePlaybackAction(io, socket, 'play', data);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on(PAUSE, async (data) => {
    try {
      await handlePlaybackAction(io, socket, 'pause', data);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on(SEEK, async (data) => {
    try {
      await handlePlaybackAction(io, socket, 'seek', data);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on(SKIP, async () => {
    try {
      await handleSkip(io, socket);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on(PLAY_SONG, async (data) => {
    try {
      await handlePlaySong(io, socket, data);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on(VOTE_SKIP, async () => {
    try {
      await handleVoteSkip(io, socket);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value));

const hasPlaybackPermission = (room, userId) => {
  const id = userId?.toString();
  if (!id) return false;

  return (room.host?._id || room.host)?.toString() === id;
};

const isRoomParticipant = (room, userId) => {
  const id = userId?.toString();
  if (!id) return false;

  const isHost = (room.host?._id || room.host)?.toString() === id;

  const isParticipant = Array.isArray(room.participants)
    ? room.participants.some((p) => {
        const pUserId = p.user?._id || p.user || p;
        return pUserId?.toString() === id;
      })
    : false;

  return isHost || isParticipant;
};

const getFreshUserAndRoomId = async (socket) => {
  const freshUser = await User.findById(socket.user?._id);
  if (!freshUser) throw new Error('User not found');

  socket.user = freshUser;

  const socketRoomId = Array.from(socket.rooms).find((r) => r !== socket.id);
  const roomId =
    (freshUser.currentRoom && freshUser.currentRoom.toString()) || socketRoomId;

  if (!roomId) throw new Error('Not in a room');

  return { user: freshUser, roomId };
};

const populateRoom = (query) =>
  query
    .populate('host', 'username avatar')
    .populate('moderators', 'username avatar')
    .populate('participants.user', 'username avatar')
    .populate('queue')
    .populate('playback.currentSong');

const getUpdatedRoom = async (roomId) => populateRoom(Room.findById(roomId));

const getOrCreateRoomHistory = async (roomId) => {
  let history = await RoomHistory.findOne({
    room: roomId,
    sessionEnd: null
  }).sort({ sessionStart: -1 });

  if (!history) {
    history = await RoomHistory.create({
      room: roomId,
      sessionStart: new Date()
    });
  }

  return history;
};

const appendRoomHistorySong = async (roomId, songId, duration) => {
  if (!songId) return null;

  const history = await getOrCreateRoomHistory(roomId);

  history.songsPlayed.push({
    song: songId,
    playedAt: new Date(),
    duration
  });

  await history.save();

  return history;
};

const findSongInQueue = (queue = [], songId) => {
  const target = songId?.toString();
  if (!target) return { selectedSong: null, queueIndex: -1 };

  const queueIndex = queue.findIndex((item) => {
    const itemId = item?._id?.toString();
    const sourceId = item?.sourceId?.toString();

    return itemId === target || sourceId === target;
  });

  return {
    selectedSong: queueIndex !== -1 ? queue[queueIndex] : null,
    queueIndex
  };
};

const handlePlaybackAction = async (io, socket, action, data = {}) => {
  const { user, roomId } = await getFreshUserAndRoomId(socket);

  const room = await Room.findById(roomId);
  if (!room) throw new Error('Room not found');

  if (!hasPlaybackPermission(room, user._id)) {
    throw new Error('Only host and moderators can control playback');
  }

  const state = getEffectivePlaybackState(roomStates.get(roomId));
  const now = Date.now();

  const requestedTime =
    typeof data.currentTime === 'number'
      ? Math.max(0, data.currentTime)
      : state.currentTime;

  switch (action) {
    case 'play':
      state.isPlaying = true;
      state.currentTime = requestedTime;
      startPeriodicSync(io, roomId);
      break;

    case 'pause':
      state.isPlaying = false;
      state.currentTime = requestedTime;
      stopPeriodicSync(roomId);
      break;

    case 'seek':
      state.currentTime = requestedTime;
      break;

    default:
      throw new Error('Invalid playback action');
  }

  state.lastUpdateTime = now;
  roomStates.set(roomId, state);

  if (!room.playback) room.playback = {};
  room.playback.isPlaying = state.isPlaying;
  room.playback.currentTime = state.currentTime;
  room.playback.lastUpdateTime = state.lastUpdateTime;

  await room.save();

  io.to(roomId).emit(PLAYBACK_SYNC, {
    action,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
    lastUpdateTime: state.lastUpdateTime,
    timestamp: now,
    userId: user._id,
    isHostAction: true
  });

  logger.info(`Playback ${action} in room ${room.name} by ${user.username}`);
};

const handlePlaySong = async (io, socket, data) => {
  const { user, roomId } = await getFreshUserAndRoomId(socket);

  const songId = data?.songId;
  if (!songId) throw new Error('Song ID is required');

  const room = await populateRoom(Room.findById(roomId));
  if (!room) throw new Error('Room not found');

  if (!hasPlaybackPermission(room, user._id)) {
    throw new Error('Only host and moderators can control playback');
  }

  const { selectedSong: queuedSong, queueIndex } = findSongInQueue(
    room.queue,
    songId
  );

  let nextSong = queuedSong;

  if (!nextSong && isValidObjectId(songId)) {
    nextSong = await Song.findById(songId);
  }

  if (!nextSong) {
    throw new Error('Song not found');
  }

  if (!room.playback) room.playback = {};
  room.playback.currentSong = nextSong._id;
  room.playback.currentTime = 0;
  room.playback.isPlaying = true;
  room.playback.lastUpdateTime = Date.now();

  if (queueIndex !== -1) {
    room.queue.splice(queueIndex, 1);
  }

  room.stats = room.stats || {};
  room.stats.songsPlayed = (room.stats.songsPlayed || 0) + 1;

  await room.save();
  await appendRoomHistorySong(roomId, nextSong._id, nextSong.duration);

  const state = getEffectivePlaybackState(roomStates.get(roomId));

  state.currentSong = nextSong;
  state.currentTime = 0;
  state.isPlaying = true;
  state.lastUpdateTime = Date.now();
  state.skipVotes = [];

  roomStates.set(roomId, state);

  startPeriodicSync(io, roomId);

  const updatedRoom = await getUpdatedRoom(roomId);

  io.to(roomId).emit(ROOM_UPDATED, { room: updatedRoom });

  io.to(roomId).emit(SONG_CHANGED, {
    song: nextSong,
    currentTime: 0,
    isPlaying: true,
    userId: user._id,
    isHostAction: true,
    timestamp: Date.now()
  });

  logger.info(`Song changed in room ${room.name} by ${user.username}`);
};

const finishPlayback = async (io, roomId, room, user, isHostAction) => {
  if (!room.playback) room.playback = {};
  room.playback.isPlaying = false;
  room.playback.currentSong = null;
  room.playback.currentTime = 0;
  room.playback.lastUpdateTime = Date.now();

  await room.save();

  const state = getEffectivePlaybackState(roomStates.get(roomId));

  state.isPlaying = false;
  state.currentSong = null;
  state.currentTime = 0;
  state.lastUpdateTime = Date.now();
  state.skipVotes = [];

  roomStates.set(roomId, state);

  stopPeriodicSync(roomId);

  const updatedRoom = await getUpdatedRoom(roomId);

  io.to(roomId).emit(ROOM_UPDATED, { room: updatedRoom });

  io.to(roomId).emit(PLAYBACK_ENDED, {
    userId: user._id,
    isHostAction,
    timestamp: Date.now()
  });
};

const playNextFromQueue = async (io, roomId, room, user, isHostAction) => {
  const nextSongId = room.queue.shift();
  const nextSong = await Song.findById(nextSongId);

  if (!nextSong) {
    await room.save();
    throw new Error('Next song not found');
  }

  if (!room.playback) room.playback = {};
  room.playback.currentSong = nextSong._id;
  room.playback.currentTime = 0;
  room.playback.isPlaying = true;
  room.playback.lastUpdateTime = Date.now();

  room.stats = room.stats || {};
  room.stats.songsPlayed = (room.stats.songsPlayed || 0) + 1;

  await room.save();
  await appendRoomHistorySong(roomId, nextSong._id, nextSong.duration);

  const state = getEffectivePlaybackState(roomStates.get(roomId));

  state.currentSong = nextSong;
  state.currentTime = 0;
  state.isPlaying = true;
  state.lastUpdateTime = Date.now();
  state.skipVotes = [];

  roomStates.set(roomId, state);

  startPeriodicSync(io, roomId);

  const updatedRoom = await getUpdatedRoom(roomId);

  io.to(roomId).emit(ROOM_UPDATED, { room: updatedRoom });

  io.to(roomId).emit(SONG_CHANGED, {
    song: nextSong,
    currentTime: 0,
    isPlaying: true,
    userId: user._id,
    isHostAction,
    timestamp: Date.now()
  });

  logger.info(`Song skipped in room ${room.name} by ${user.username}`);
};

const skipCurrentSong = async (io, roomId, user, isHostAction = true) => {
  const room = await Room.findById(roomId);
  if (!room) throw new Error('Room not found');

  if (room.queue.length > 0) {
    await playNextFromQueue(io, roomId, room, user, isHostAction);
  } else {
    await finishPlayback(io, roomId, room, user, isHostAction);
  }
};

const handleSkip = async (io, socket) => {
  const { user, roomId } = await getFreshUserAndRoomId(socket);

  const room = await Room.findById(roomId);
  if (!room) throw new Error('Room not found');

  if (!hasPlaybackPermission(room, user._id)) {
    throw new Error('Only host and moderators can skip songs');
  }

  await skipCurrentSong(io, roomId, user, true);
};

const handleVoteSkip = async (io, socket) => {
  const { user, roomId } = await getFreshUserAndRoomId(socket);

  const room = await Room.findById(roomId);
  if (!room) throw new Error('Room not found');

  if (!isRoomParticipant(room, user._id)) {
    throw new Error('Only room participants can vote skip');
  }

  const state = getEffectivePlaybackState(roomStates.get(roomId));
  const userId = user._id.toString();

  state.skipVotes = Array.isArray(state.skipVotes) ? state.skipVotes : [];

  if (state.skipVotes.includes(userId)) {
    return;
  }

  state.skipVotes.push(userId);
  roomStates.set(roomId, state);

  const participantCount = Array.isArray(room.participants)
    ? room.participants.length
    : 0;

  const threshold = Math.max(1, Math.ceil(participantCount / 2));

  if (state.skipVotes.length >= threshold) {
    state.skipVotes = [];
    roomStates.set(roomId, state);

    await skipCurrentSong(io, roomId, user, false);
    return;
  }

  io.to(roomId).emit(VOTE_UPDATE, {
    votes: state.skipVotes.length,
    threshold,
    userId: user._id,
    username: user.username
  });
};

module.exports = {
  registerPlaybackHandlers
};