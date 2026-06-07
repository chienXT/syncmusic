const logger = require('../../utils/logger');
const { voiceStages, socketToUser } = require('../socketState');
const {
  VOICE_JOIN_SLOT,
  VOICE_LEAVE_SLOT,
  VOICE_TOGGLE,
  VOICE_STATE,
  VOICE_ERROR,
  VOICE_SPEAKING_START,
  VOICE_SPEAKING_STOP,
  VOICE_USER_JOINED,
  VOICE_USER_LEFT,
  VOICE_SIGNAL_JOIN,
  VOICE_SIGNAL_LEAVE,
  VOICE_WEBRTC_OFFER,
  VOICE_WEBRTC_ANSWER,
  VOICE_WEBRTC_ICE,
  VOICE_PEER_JOINED,
  VOICE_PEER_LEFT,
} = require('../../shared/constants/socketEvents');

const MAX_SLOTS = 2;

const getStage = (roomId) => {
  if (!voiceStages.has(roomId)) {
    voiceStages.set(roomId, {
      slot1: null,
      slot2: null,
      speaking: new Set(),
    });
  }
  return voiceStages.get(roomId);
};

const getActiveSocketRoom = (socket, requestedRoomId) => {
  if (socket.currentRoom && socket.rooms.has(socket.currentRoom)) {
    return socket.currentRoom;
  }

  if (requestedRoomId && socket.rooms.has(requestedRoomId)) {
    return requestedRoomId;
  }

  return Array.from(socket.rooms).find((roomId) => roomId !== socket.id) || requestedRoomId || null;
};

const getVoicePeerSocketIds = async (io, roomId, selfSocketId) => {
  const peerIds = new Set(io.sockets.adapter.rooms.get(roomId) || []);

  for (const [socketId, peerSocket] of io.sockets.sockets) {
    if (socketId === selfSocketId) continue;
    const peerCurrentRoom = peerSocket.currentRoom || peerSocket.user?.currentRoom?.toString?.();
    if (peerCurrentRoom !== roomId) continue;

    peerIds.add(socketId);
    if (!peerSocket.rooms.has(roomId)) {
      await peerSocket.join(roomId);
      peerSocket.currentRoom = roomId;
      logger.info(`[voice] auto-joined listener for voice: socket=${socketId}, room=${roomId}`);
    }
  }

  peerIds.delete(selfSocketId);
  return Array.from(peerIds);
};

const buildStagePayload = (roomId) => {
  const stage = getStage(roomId);
  return {
    roomId,
    slots: {
      slot1: stage.slot1,
      slot2: stage.slot2,
    },
    speaking: Array.from(stage.speaking),
  };
};

const broadcastVoiceState = (io, roomId) => {
  io.to(roomId).emit(VOICE_STATE, buildStagePayload(roomId));
};

const releaseUserSlots = (io, roomId, userId) => {
  const stage = getStage(roomId);
  let released = false;

  if (stage.slot1 === userId) {
    stage.slot1 = null;
    released = true;
  }
  if (stage.slot2 === userId) {
    stage.slot2 = null;
    released = true;
  }
  if (stage.speaking.has(userId)) {
    stage.speaking.delete(userId);
    released = true;
  }

  if (released) {
    broadcastVoiceState(io, roomId);
  }

  return released;
};

const registerVoiceHandlers = (io, socket) => {
  socket.on(VOICE_JOIN_SLOT, async (data = {}) => {
    try {
      const roomId = getActiveSocketRoom(socket, data.roomId);
      if (!roomId) {
        socket.emit(VOICE_ERROR, { message: 'Bạn chưa ở trong phòng nào.' });
        return;
      }

      if (!socket.rooms.has(roomId)) {
        const userRoomId = socket.user?.currentRoom?.toString?.();
        if (userRoomId === roomId) {
          await socket.join(roomId);
          socket.currentRoom = roomId;
          logger.info(`[voice] auto-joined room for voice: socket=${socket.id}, room=${roomId}`);
        } else {
          socket.emit(VOICE_ERROR, { message: 'Socket chưa join phòng nghe nhạc.' });
          logger.warn(`[voice] join rejected: socket=${socket.id}, requested=${data.roomId}, current=${socket.currentRoom}, rooms=${Array.from(socket.rooms).join(',')}`);
          return;
        }
      }

      logger.info(`[voice] join request: user=${socket.user.username}, requested=${data.roomId}, resolved=${roomId}, socket=${socket.id}`);

      const userId = socket.user._id.toString();
      const stage = getStage(roomId);

      // Already in a slot
      if (stage.slot1 === userId || stage.slot2 === userId) {
        socket.emit(VOICE_STATE, buildStagePayload(roomId));
        return;
      }

      // Find first available slot
      let assignedSlot = null;
      if (stage.slot1 === null) {
        stage.slot1 = userId;
        assignedSlot = 'slot1';
      } else if (stage.slot2 === null) {
        stage.slot2 = userId;
        assignedSlot = 'slot2';
      }

      if (!assignedSlot) {
        socket.emit(VOICE_ERROR, { message: 'Đã đủ 2 người trên sân khấu. Vui lòng đợi.' });
        return;
      }

      logger.info(`[voice] ${socket.user.username} joined slot ${assignedSlot} in room ${roomId}`);
      broadcastVoiceState(io, roomId);

      socket.to(roomId).emit(VOICE_USER_JOINED, {
        userId,
        username: socket.user.username,
        slot: assignedSlot,
      });
    } catch (error) {
      logger.error(`[voice] join slot error: ${error.message}`);
      socket.emit(VOICE_ERROR, { message: 'Không thể vào vị trí mic.' });
    }
  });

  socket.on(VOICE_LEAVE_SLOT, (data = {}) => {
    try {
      const roomId = getActiveSocketRoom(socket, data.roomId);
      if (!roomId) return;

      const userId = socket.user._id.toString();
      const released = releaseUserSlots(io, roomId, userId);

      if (released) {
        logger.info(`[voice] ${socket.user.username} left voice stage in room ${roomId}`);
        socket.to(roomId).emit(VOICE_USER_LEFT, {
          userId,
          username: socket.user.username,
        });
      }
    } catch (error) {
      logger.error(`[voice] leave slot error: ${error.message}`);
    }
  });

  socket.on(VOICE_TOGGLE, (data = {}) => {
    try {
      const roomId = getActiveSocketRoom(socket, data.roomId);
      if (!roomId) return;

      const userId = socket.user._id.toString();
      const stage = getStage(roomId);

      const inSlot = stage.slot1 === userId || stage.slot2 === userId;
      if (!inSlot) {
        socket.emit(VOICE_ERROR, { message: 'Bạn chưa ở trên sân khấu để bật/tắt mic.' });
        return;
      }

      const enabled = !!data.enabled;
      if (enabled) {
        stage.speaking.add(userId);
        io.to(roomId).emit(VOICE_SPEAKING_START, { userId, username: socket.user.username });
      } else {
        stage.speaking.delete(userId);
        io.to(roomId).emit(VOICE_SPEAKING_STOP, { userId, username: socket.user.username });
        socket.to(roomId).emit(VOICE_PEER_LEFT, { peerId: socket.id, userId, username: socket.user.username });
      }

      broadcastVoiceState(io, roomId);
    } catch (error) {
      logger.error(`[voice] toggle mic error: ${error.message}`);
    }
  });

  socket.on(VOICE_SIGNAL_JOIN, async (data = {}) => {
    try {
      const roomId = getActiveSocketRoom(socket, data.roomId);
      if (!roomId) return;

      if (!socket.rooms.has(roomId)) {
        const userRoomId = socket.user?.currentRoom?.toString?.();
        if (userRoomId === roomId) {
          await socket.join(roomId);
          socket.currentRoom = roomId;
          logger.info(`[voice] auto-joined room for signaling: socket=${socket.id}, room=${roomId}`);
        } else {
          logger.warn(`[voice] signal join rejected: socket=${socket.id}, requested=${data.roomId}, current=${socket.currentRoom}, rooms=${Array.from(socket.rooms).join(',')}`);
          return;
        }
      }

      const userId = socket.user._id.toString();
      const stage = getStage(roomId);
      stage.speaking.add(userId);
      const existingPeerIds = await getVoicePeerSocketIds(io, roomId, socket.id);

      // Tell every listener/speaker about the new speaker. Emit trực tiếp để không phụ thuộc adapter room.
      existingPeerIds.forEach((peerId) => {
        io.to(peerId).emit(VOICE_PEER_JOINED, {
          peerId: socket.id,
          userId,
          username: socket.user.username,
        });
      });

      // Tell the new speaker about existing peers so it can create offers toward them.
      existingPeerIds.forEach((peerId) => {
        const peerSocket = io.sockets.sockets.get(peerId);
        if (!peerSocket) return;
        socket.emit(VOICE_PEER_JOINED, {
          peerId,
          userId: peerSocket.user?._id?.toString?.() || peerId,
          username: peerSocket.user?.username || 'Unknown',
        });
      });

      broadcastVoiceState(io, roomId);
      logger.info(`[voice] peer joined: user=${socket.user.username}, room=${roomId}, socket=${socket.id}, existingPeers=${existingPeerIds.length}`);
    } catch (error) {
      logger.error(`[voice] signal join error: ${error.message}`);
    }
  });

  socket.on(VOICE_SIGNAL_LEAVE, (data = {}) => {
    try {
      const roomId = getActiveSocketRoom(socket, data.roomId);
      if (!roomId) return;
      const userId = socket.user._id.toString();
      const stage = getStage(roomId);
      stage.speaking.delete(userId);
      socket.to(roomId).emit(VOICE_PEER_LEFT, { peerId: socket.id, userId, username: socket.user.username });
      broadcastVoiceState(io, roomId);
      logger.info(`[voice] peer left: user=${socket.user.username}, room=${roomId}, socket=${socket.id}`);
    } catch (error) {
      logger.error(`[voice] signal leave error: ${error.message}`);
    }
  });

  socket.on(VOICE_WEBRTC_OFFER, (data = {}) => {
    if (!data.to) return;
    logger.info(`[voice] forward offer: from=${socket.id}, to=${data.to}`);
    io.to(data.to).emit(VOICE_WEBRTC_OFFER, {
      from: socket.id,
      to: data.to,
      offer: data.offer,
      userId: socket.user._id.toString(),
      username: socket.user.username,
    });
  });

  socket.on(VOICE_WEBRTC_ANSWER, (data = {}) => {
    if (!data.to) return;
    logger.info(`[voice] forward answer: from=${socket.id}, to=${data.to}`);
    io.to(data.to).emit(VOICE_WEBRTC_ANSWER, {
      from: socket.id,
      to: data.to,
      answer: data.answer,
      userId: socket.user._id.toString(),
      username: socket.user.username,
    });
  });

  socket.on(VOICE_WEBRTC_ICE, (data = {}) => {
    if (!data.to) return;
    logger.debug?.(`[voice] forward ice: from=${socket.id}, to=${data.to}`);
    io.to(data.to).emit(VOICE_WEBRTC_ICE, {
      from: socket.id,
      to: data.to,
      candidate: data.candidate,
      userId: socket.user._id.toString(),
      username: socket.user.username,
    });
  });

  // Cleanup when user leaves room
  socket.on('leave_room', (data, ack) => {
    try {
      const roomId = socket.currentRoom;
      if (roomId) {
        const userId = socket.user._id.toString();
        releaseUserSlots(io, roomId, userId);
        socket.to(roomId).emit(VOICE_PEER_LEFT, { peerId: socket.id, userId, username: socket.user.username });
      }
    } catch (error) {
      logger.error(`[voice] leave room cleanup error: ${error.message}`);
    }
  });
};

const cleanupVoiceStageOnDisconnect = (io, socket) => {
  try {
    const userId = socket.user?._id?.toString();
    if (!userId) return;

    // Iterate all rooms this socket was in
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue;
      const stage = voiceStages.get(roomId);
      if (!stage) continue;

      const wasInSlot = stage.slot1 === userId || stage.slot2 === userId;
      const wasSpeaking = stage.speaking.has(userId);

      if (wasInSlot || wasSpeaking) {
        releaseUserSlots(io, roomId, userId);
        socket.to(roomId).emit(VOICE_USER_LEFT, {
          userId,
          username: socket.user?.username || 'Unknown',
        });
        socket.to(roomId).emit(VOICE_PEER_LEFT, {
          peerId: socket.id,
          userId,
          username: socket.user?.username || 'Unknown',
        });
        logger.info(`[voice] ${socket.user?.username} disconnected, released voice stage in room ${roomId}`);
      }
    }
  } catch (error) {
    logger.error(`[voice] disconnect cleanup error: ${error.message}`);
  }
};

module.exports = {
  registerVoiceHandlers,
  cleanupVoiceStageOnDisconnect,
  getStage,
  releaseUserSlots,
};
