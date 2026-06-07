const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const roomController = require('./room.controller');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validation');
const { apiLimiter } = require('../../middleware/rateLimit');
const { validateSchema, createRoomSchema, joinRoomSchema } = require('../../shared/validators/roomValidator');

/**
 * @route   POST /api/rooms
 * @desc    Create a new room
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  apiLimiter,
  validateSchema(createRoomSchema),
  validate,
  roomController.createRoom
);

/**
 * @route   GET /api/rooms
 * @desc    Get all rooms
 * @access  Public
 */
router.get('/', roomController.getRooms);

/**
 * @route   GET /api/rooms/trending
 * @desc    Get trending rooms
 * @access  Public
 */
router.get('/trending', roomController.getTrendingRooms);

/**
 * @route   GET /api/rooms/my-hosted
 * @desc    Get my active hosted room
 * @access  Private
 */
router.get('/my-hosted', authenticate, roomController.getMyHostedRoom);

/**
 * @route   POST /api/rooms/join
 * @desc    Join a room
 * @access  Private
 */
router.post(
  '/join',
  authenticate,
  apiLimiter,
  validateSchema(joinRoomSchema),
  validate,
  roomController.joinRoom
);

/**
 * @route   GET /api/rooms/stats
 * @desc    Get public site statistics
 * @access  Public
 */
router.get('/stats', roomController.getStats);

/**
 * @route   GET /api/rooms/:identifier
 * @desc    Get room by ID or invite code
 * @access  Public
 */
router.get('/:identifier', authenticate, roomController.getRoom);

/**
 * @route   GET /api/rooms/:roomId/history
 * @desc    Get room playback history
 * @access  Private
 */
router.get('/:roomId/history', authenticate, roomController.getRoomHistory);

/**
 * @route   POST /api/rooms/:roomId/leave
 * @desc    Leave a room
 * @access  Private
 */
router.post('/:roomId/leave', authenticate, roomController.leaveRoom);

/**
 * @route   PUT /api/rooms/:roomId
 * @desc    Update room settings
 * @access  Private (host only)
 */
router.put(
  '/:roomId',
  authenticate,
  apiLimiter,
  roomController.updateRoom
);

/**
 * @route   DELETE /api/rooms/:roomId
 * @desc    Delete a room
 * @access  Private (host only)
 */
router.delete('/:roomId', authenticate, roomController.deleteRoom);

/**
 * @route   POST /api/rooms/:roomId/moderators
 * @desc    Add moderator
 * @access  Private (host only)
 */
router.post(
  '/:roomId/moderators',
  authenticate,
  [body('userId').notEmpty().withMessage('User ID is required')],
  validate,
  roomController.addModerator
);

/**
 * @route   DELETE /api/rooms/:roomId/moderators
 * @desc    Remove moderator
 * @access  Private (host only)
 */
router.delete(
  '/:roomId/moderators',
  authenticate,
  [body('userId').notEmpty().withMessage('User ID is required')],
  validate,
  roomController.removeModerator
);

module.exports = router;
