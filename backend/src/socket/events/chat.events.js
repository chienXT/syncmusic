const Message = require('../../models/Message');
const logger = require('../../utils/logger');
const {
  SEND_MESSAGE,
  NEW_MESSAGE,
  MESSAGE_SENT,
  USER_TYPING,
  USER_STOP_TYPING,
  ADD_REACTION,
  MESSAGE_UPDATED
} = require('../../shared/constants/socketEvents');

const registerChatHandlers = (socket) => {
  socket.on(SEND_MESSAGE, async (data) => {
    try {
      await handleSendMessage(socket, data);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on(USER_TYPING, () => {
    const user = socket.user;
    if (user && user.currentRoom) {
      socket.to(user.currentRoom.toString()).emit(USER_TYPING, {
        userId: user._id,
        username: user.username
      });
    }
  });

  socket.on(USER_STOP_TYPING, () => {
    const user = socket.user;
    if (user && user.currentRoom) {
      socket.to(user.currentRoom.toString()).emit(USER_STOP_TYPING, {
        userId: user._id
      });
    }
  });

  socket.on(ADD_REACTION, async (data) => {
    try {
      await handleAddReaction(socket, data);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
};

const handleSendMessage = async (socket, data) => {
  const user = socket.user;
  const { content, type = 'text' } = data;

  if (!user.currentRoom) {
    throw new Error('Not in a room');
  }

  const message = await Message.create({
    room: user.currentRoom,
    sender: user._id,
    content,
    type
  });

  const populatedMessage = await Message.findById(message._id).populate('sender', 'username avatar');

  socket.to(user.currentRoom.toString()).emit(NEW_MESSAGE, populatedMessage);
  socket.emit(MESSAGE_SENT, populatedMessage);

  logger.info(`Message sent in room by ${user.username}`);
};

const handleAddReaction = async (socket, data) => {
  const { messageId, emoji } = data;
  const user = socket.user;

  const message = await Message.findById(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  const existingReaction = message.reactions.find((r) => r.emoji === emoji);
  if (existingReaction) {
    if (!existingReaction.users.includes(user._id)) {
      existingReaction.users.push(user._id);
    }
  } else {
    message.reactions.push({
      emoji,
      users: [user._id]
    });
  }

  await message.save();

  const updatedMessage = await Message.findById(messageId)
    .populate('sender', 'username avatar')
    .populate('reactions.users', 'username');

  socket.to(message.room.toString()).emit(MESSAGE_UPDATED, updatedMessage);
  socket.emit(MESSAGE_UPDATED, updatedMessage);
};

module.exports = {
  registerChatHandlers
};
