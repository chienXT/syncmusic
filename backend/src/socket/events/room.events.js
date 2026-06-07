const Room = require('../../models/Room');
const User = require('../../models/User');
const Message = require('../../models/Message');
const logger = require('../../utils/logger');
const {
  roomStates,
  getEffectivePlaybackState,
  isUserAlreadyInRoomViaAnotherSocket
} = require('../socketState');
const {
  ROOM_JOIN,
  ROOM_LEAVE,
  ROOM_STATE,
  USER_JOINED,
  USER_LEFT,
  HOST_LEFT
} = require('../../shared/constants/socketEvents');

const getActiveParticipantIds = (io, roomId) => {
  const socketIds = io.sockets.adapter.rooms.get(roomId) || new Set();
  return Array.from(socketIds)
    .map((socketId) => io.sockets.sockets.get(socketId)?.user?._id?.toString())
    .filter(Boolean);
};

const buildRoomResponse = (room, state, socketUserId, io, roomId) => {
  const isModerator = room.moderators.some(
    (m) => (m?._id ? m._id.toString() : m.toString()) === socketUserId
  );

  return {
    room: {
      ...room.toObject?.() || room,
      activeParticipantIds: getActiveParticipantIds(io, roomId)
    },
    playback: {
      isPlaying: state.isPlaying,
      currentTime: state.currentTime,
      currentSong: state.currentSong,
      lastUpdateTime: state.lastUpdateTime
    },
    isHost: room.host?._id?.toString() === socketUserId,
    isModerator
  };
};

const registerRoomHandlers = (io, socket) => {
  socket.on(ROOM_JOIN, async (data) => {
    try {
      await joinRoom(io, socket, data.roomId);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on(ROOM_LEAVE, async () => {
    try {
      await leaveRoom(socket);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
};

const joinRoom = async (io, socket, roomId) => {
  const freshUser = await User.findById(socket.user._id);
  socket.user = freshUser;

  const room = await Room.findById(roomId)
    .populate('host', 'username avatar status currentRoom')
    .populate('moderators', 'username avatar currentRoom')
    .populate('participants.user', 'username avatar status currentRoom')
    .populate('playback.currentSong', 'title artist album duration coverArt audioUrl source sourceId')
    .populate('queue', 'title artist album duration coverArt audioUrl source sourceId');

  if (!room) {
    throw new Error('Room not found');
  }

  if (socket.currentRoom === roomId || socket.rooms.has(roomId)) {
    logger.info(`Socket already in room: ${socket.id} -> ${room.name}`);
    
    // Even if already in room, we must send the current state and messages 
    // because the client-side component might have just remounted.
    const existingState = roomStates.get(roomId);
    const state = getEffectivePlaybackState(existingState || {
      isPlaying: room.playback?.isPlaying || false,
      currentTime: room.playback?.currentTime || 0,
      currentSong: room.playback?.currentSong || null,
      lastUpdateTime: room.playback?.lastUpdateTime || Date.now(),
    });

    const messages = await Message.find({ room: roomId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'username avatar');

    socket.emit(ROOM_STATE, {
      ...buildRoomResponse(room, state, socket.user._id.toString(), io, roomId),
      messages: messages.reverse()
    });
    return;
  }

  const userId = freshUser._id.toString();
  const isHost = room.host?._id?.toString() === userId || room.host?.toString() === userId;
  const isParticipant = room.participants.some(
    (p) => p.user._id.toString() === userId
  );
  const isModeratorMember = room.moderators.some((m) => m.toString() === userId);

  if (!isHost && !isModeratorMember && !isParticipant) {
    throw new Error('Not a member of this room');
  }

  const joinedRooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
  joinedRooms.forEach((existingRoomId) => socket.leave(existingRoomId));

  socket.join(roomId);
  socket.currentRoom = roomId;

  if (!freshUser.currentRoom || freshUser.currentRoom.toString() !== roomId.toString()) {
    await User.updateOne(
      { _id: freshUser._id },
      { $set: { currentRoom: room._id, status: 'listening' } }
    );
    socket.user = await User.findById(freshUser._id);
  }

  const existingState = roomStates.get(roomId);
  const baseState = existingState || {
    isPlaying: room.playback?.isPlaying || false,
    currentTime: room.playback?.currentTime || 0,
    currentSong: room.playback?.currentSong || null,
    lastUpdateTime: room.playback?.lastUpdateTime || Date.now(),
    skipVotes: []
  };
  const state = getEffectivePlaybackState({
    ...baseState,
    skipVotes: existingState?.skipVotes || baseState.skipVotes || []
  });
  roomStates.set(roomId, state);

  // Fetch recent messages for the room
  const messages = await Message.find({ room: roomId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('sender', 'username avatar');

  socket.emit(ROOM_STATE, {
    ...buildRoomResponse(room, state, socket.user._id.toString(), io, roomId),
    messages: messages.reverse()
  });

  const isAlreadyInRoom = isUserAlreadyInRoomViaAnotherSocket(socket, roomId);
  if (!isAlreadyInRoom) {
    socket.to(roomId).emit(USER_JOINED, {
      userId: socket.user._id,
      username: socket.user.username,
      avatar: socket.user.avatar
    });
    logger.info(`Socket joined room: ${socket.user.username} -> ${room.name}`);
  } else {
    logger.info(`Socket rejoined room via another socket: ${socket.user.username} -> ${room.name}`);
  }
};

const leaveRoom = async (socket, options = {}) => {
  const { status = 'online' } = options;
  const user = socket.user;

  if (!user.currentRoom) {
    return;
  }

  const roomId = user.currentRoom.toString();
  socket.leave(roomId);
  socket.currentRoom = null;

  const room = await Room.findById(roomId).populate('host', 'username');
  if (room) {
    const isHost = room.host?._id?.toString() === user._id.toString();
    if (isHost) {
      if (room.isActive) {
        room.isActive = false;
        await room.save();
        socket.to(roomId).emit(HOST_LEFT, {
          userId: user._id,
          username: user.username
        });
      }
    } else {
      socket.to(roomId).emit(USER_LEFT, {
        userId: user._id,
        username: user.username
      });
    }
  }

  const userUpdate = { currentRoom: null };
  if (typeof status === 'string') userUpdate.status = status;
  await User.updateOne(
    { _id: user._id },
    { $set: userUpdate }
  );
  socket.user = await User.findById(user._id);

  logger.info(`${user.username} left room`);
};

module.exports = {
  registerRoomHandlers,
  joinRoom,
  leaveRoom
};
