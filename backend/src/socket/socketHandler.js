const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { socketToUser, userToSockets } = require('./socketState');
const roomEvents = require('./events/room.events');
const playerEvents = require('./events/player.events');
const syncEvents = require('./events/sync.events');
const chatEvents = require('./events/chat.events');
const presenceEvents = require('./events/presence.events');
const voiceEvents = require('./events/voice.events');

const socketAuthentication = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });
};

const handleConnection = async (io, socket) => {
  const user = socket.user;
  logger.info(`User connected: ${user.username} (${socket.id})`);

  const userId = user._id.toString();
  const existingSockets = userToSockets.get(userId);
  if (existingSockets && existingSockets.size > 0) {
    for (const oldSocketId of Array.from(existingSockets)) {
      if (oldSocketId === socket.id) continue;
      const oldSocket = io.sockets.sockets.get(oldSocketId);
      if (oldSocket) {
        logger.info(`Forcing logout on existing socket for user ${user.username}: ${oldSocketId}`);
        oldSocket.emit('force_logout', {
          reason: 'another_session',
          message: 'Tài khoản của bạn đã đăng nhập ở thiết bị khác.'
        });
        oldSocket.disconnect(true);
      }
      socketToUser.delete(oldSocketId);
      existingSockets.delete(oldSocketId);
    }
  }

  socketToUser.set(socket.id, userId);
  if (!userToSockets.has(userId)) {
    userToSockets.set(userId, new Set());
  }
  userToSockets.get(userId).add(socket.id);

  await User.updateOne(
    { _id: user._id },
    { $set: { isOnline: true } }
  );

  voiceEvents.registerVoiceHandlers(io, socket);
  roomEvents.registerRoomHandlers(io, socket);
  playerEvents.registerPlaybackHandlers(io, socket);
  syncEvents.registerSyncHandlers(socket);
  chatEvents.registerChatHandlers(socket);
  presenceEvents.registerPresenceHandlers(socket);

  socket.on('disconnect', () => handleDisconnect(io, socket));
};

const handleDisconnect = async (io, socket) => {
  const userId = socketToUser.get(socket.id);
  if (!userId) return;

  voiceEvents.cleanupVoiceStageOnDisconnect(io, socket);

  const userSockets = userToSockets.get(userId);
  if (userSockets) {
    userSockets.delete(socket.id);
    if (userSockets.size === 0) {
      userToSockets.delete(userId);
      try {
        await User.updateOne(
          { _id: userId },
          { $set: { isOnline: false, lastSeen: new Date() } }
        );
      } catch (error) {
        logger.error(`Error handling disconnect for user ${userId}: ${error.message}`);
      }
    }
  }

  socketToUser.delete(socket.id);
  logger.info(`User disconnected: ${socket.id}`);
};

module.exports = {
  socketAuthentication,
  handleConnection,
  handleDisconnect
};
