const User = require('../../models/User');
const {
  UPDATE_STATUS,
  USER_STATUS_CHANGED
} = require('../../shared/constants/socketEvents');

const registerPresenceHandlers = (socket) => {
  socket.on(UPDATE_STATUS, async (data) => {
    try {
      const user = socket.user;
      user.status = data.status;
      await user.save();

      if (user.currentRoom) {
        socket.to(user.currentRoom.toString()).emit(USER_STATUS_CHANGED, {
          userId: user._id,
          status: data.status
        });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
};

module.exports = {
  registerPresenceHandlers
};
