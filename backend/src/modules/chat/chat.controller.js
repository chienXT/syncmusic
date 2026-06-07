const Message = require('../../models/Message');
const Room = require('../../models/Room');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../../utils/errors');
const logger = require('../../utils/logger');

/**
 * Get messages for a room with pagination
 */
exports.getRoomMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw new NotFoundError('Room not found');
    }
    
    const messages = await Message.find({ 
      room: roomId,
      deletedAt: null
    })
      .populate('sender', 'username avatar status')
      .populate('replyTo', 'sender content')
      .populate('reactions.users', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Message.countDocuments({ 
      room: roomId,
      deletedAt: null
    });
    
    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message to a room
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { content, type = 'text', replyTo } = req.body;
    
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw new NotFoundError('Room not found');
    }
    
    // Check if user is in room
    const isInRoom = room.participants.some(
      p => p.user.toString() === req.user._id.toString()
    );
    
    if (!isInRoom) {
      throw new BadRequestError('You must be in the room to send messages');
    }
    
    const message = await Message.create({
      room: roomId,
      sender: req.user._id,
      content,
      type,
      replyTo
    });
    
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar status')
      .populate('replyTo', 'sender content')
      .populate('reactions.users', 'username');
    
    logger.info(`Message sent in room ${room.name} by ${req.user.username}`);
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: populatedMessage }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Edit a message
 */
exports.editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      throw new NotFoundError('Message not found');
    }
    
    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('Only message sender can edit');
    }
    
    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();
    
    const populatedMessage = await Message.findById(messageId)
      .populate('sender', 'username avatar status')
      .populate('replyTo', 'sender content')
      .populate('reactions.users', 'username');
    
    res.json({
      success: true,
      message: 'Message edited successfully',
      data: { message: populatedMessage }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a message
 */
exports.deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      throw new NotFoundError('Message not found');
    }
    
    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('Only message sender can delete');
    }
    
    message.deletedAt = new Date();
    await message.save();
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add reaction to message
 */
exports.addReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      throw new NotFoundError('Message not found');
    }
    
    // Check if reaction already exists
    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    
    if (existingReaction) {
      // Check if user already reacted
      if (existingReaction.users.includes(req.user._id)) {
        throw new BadRequestError('Already reacted with this emoji');
      }
      existingReaction.users.push(req.user._id);
    } else {
      message.reactions.push({
        emoji,
        users: [req.user._id]
      });
    }
    
    await message.save();
    
    const populatedMessage = await Message.findById(messageId)
      .populate('sender', 'username avatar status')
      .populate('reactions.users', 'username');
    
    res.json({
      success: true,
      message: 'Reaction added',
      data: { message: populatedMessage }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove reaction from message
 */
exports.removeReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      throw new NotFoundError('Message not found');
    }
    
    const reaction = message.reactions.find(r => r.emoji === emoji);
    
    if (!reaction) {
      throw new BadRequestError('Reaction not found');
    }
    
    reaction.users = reaction.users.filter(id => id.toString() !== req.user._id.toString());
    
    // Remove reaction if no users left
    if (reaction.users.length === 0) {
      message.reactions = message.reactions.filter(r => r.emoji !== emoji);
    }
    
    await message.save();
    
    const populatedMessage = await Message.findById(messageId)
      .populate('sender', 'username avatar status')
      .populate('reactions.users', 'username');
    
    res.json({
      success: true,
      message: 'Reaction removed',
      data: { message: populatedMessage }
    });
  } catch (error) {
    next(error);
  }
};
