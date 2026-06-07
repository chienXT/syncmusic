const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const messageController = require('./chat.controller');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validation');
const { apiLimiter } = require('../../middleware/rateLimit');

/**
 * @route   GET /api/messages/room/:roomId
 * @desc    Get messages for a room
 * @access  Private
 */
router.get('/room/:roomId', authenticate, messageController.getRoomMessages);

/**
 * @route   POST /api/messages/room/:roomId
 * @desc    Send a message to a room
 * @access  Private
 */
router.post(
  '/room/:roomId',
  authenticate,
  apiLimiter,
  [
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Message content is required')
      .isLength({ max: 500 })
      .withMessage('Message cannot exceed 500 characters'),
    body('type')
      .optional()
      .isIn(['text', 'emoji', 'system', 'reaction'])
      .withMessage('Invalid message type')
  ],
  validate,
  messageController.sendMessage
);

/**
 * @route   PUT /api/messages/:messageId
 * @desc    Edit a message
 * @access  Private (sender only)
 */
router.put(
  '/:messageId',
  authenticate,
  [body('content').trim().notEmpty().withMessage('Content is required')],
  validate,
  messageController.editMessage
);

/**
 * @route   DELETE /api/messages/:messageId
 * @desc    Delete a message
 * @access  Private (sender only)
 */
router.delete('/:messageId', authenticate, messageController.deleteMessage);

/**
 * @route   POST /api/messages/:messageId/reaction
 * @desc    Add reaction to message
 * @access  Private
 */
router.post(
  '/:messageId/reaction',
  authenticate,
  [body('emoji').notEmpty().withMessage('Emoji is required')],
  validate,
  messageController.addReaction
);

/**
 * @route   DELETE /api/messages/:messageId/reaction
 * @desc    Remove reaction from message
 * @access  Private
 */
router.delete('/:messageId/reaction', authenticate, messageController.removeReaction);

module.exports = router;
