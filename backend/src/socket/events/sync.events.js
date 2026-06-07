const User = require('../../models/User');
const {
  SYNC_REQUEST,
  SYNC_RESPONSE
} = require('../../shared/constants/socketEvents');
const {
  roomStates,
  getEffectivePlaybackState
} = require('../socketState');

const registerSyncHandlers = (socket) => {
  socket.on(SYNC_REQUEST, async () => {
    try {
      await handleSyncRequest(socket);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
};

const handleSyncRequest = async (socket) => {
  const freshUser = await User.findById(socket.user._id);
  if (!freshUser.currentRoom) {
    const socketRooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    if (socketRooms.length > 0) {
      await User.updateOne(
        { _id: freshUser._id },
        { $set: { currentRoom: socketRooms[0], status: 'listening' } }
      );
      socket.user = await User.findById(freshUser._id);
    } else {
      return;
    }
  }

  if (!freshUser.currentRoom) {
    return;
  }
  const roomId = freshUser.currentRoom.toString();
  const state = getEffectivePlaybackState(roomStates.get(roomId));
  if (!state) {
    return;
  }

  roomStates.set(roomId, state);
  socket.emit(SYNC_RESPONSE, {
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
    lastUpdateTime: state.lastUpdateTime,
    timestamp: Date.now(),
    currentSong: state.currentSong
  });
};

module.exports = {
  registerSyncHandlers
};
