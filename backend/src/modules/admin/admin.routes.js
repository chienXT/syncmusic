const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('./admin.controller');
const { authenticate } = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/adminAuth');
const { validate } = require('../../middleware/validation');

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Private (admin only)
 */
router.get('/dashboard', authenticate, adminAuth, adminController.getDashboard);

/**
 * @route   GET /api/admin/stats
 * @desc    Get system statistics
 * @access  Private (admin only)
 */
router.get('/stats', authenticate, adminAuth, adminController.getStats);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private (admin only)
 */
router.get('/users', authenticate, adminAuth, adminController.getUsers);

/**
 * @route   GET /api/admin/users/search
 * @desc    Search users
 * @access  Private (admin only)
 */
router.get('/users/search', authenticate, adminAuth, adminController.searchUsers);

/**
 * @route   PUT /api/admin/users/:userId/role
 * @desc    Set user role
 * @access  Private (admin only)
 */
router.put(
  '/users/:userId/role',
  authenticate,
  adminAuth,
  [body('role').isIn(['user', 'moderator', 'admin']).withMessage('Invalid role')],
  validate,
  adminController.setUserRole
);
/**
 * @route   GET /api/admin/rooms
 * @desc    Get all rooms
 * @access  Private (admin only)
 */
router.get('/rooms', authenticate, adminAuth, adminController.getRooms);

/**
 * @route   GET /api/admin/lyrics-cache
 * @desc    Get cached lyrics entries
 * @access  Private (admin only)
 */
router.get('/lyrics-cache', authenticate, adminAuth, adminController.getLyricsCache);

/**
 * @route   PUT /api/admin/rooms/:roomId
 * @desc    Update a room
 * @access  Private (admin only)
 */
router.put(
  '/rooms/:roomId',
  authenticate,
  adminAuth,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Room name must be between 3 and 50 characters'),
    body('description')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Description cannot exceed 200 characters'),
    body('maxParticipants')
      .optional()
      .isInt({ min: 2, max: 100 })
      .withMessage('Max participants must be between 2 and 100'),
    body('isPrivate')
      .optional()
      .isBoolean()
      .withMessage('isPrivate must be boolean'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be boolean')
  ],
  validate,
  adminController.updateRoom
);

/**
 * @route   DELETE /api/admin/rooms/:roomId
 * @desc    Delete a room
 * @access  Private (admin only)
 */
router.delete('/rooms/:roomId', authenticate, adminAuth, adminController.deleteRoom);

/**
 * @route   PUT /api/admin/lyrics/:sourceId
 * @desc    Update lyrics cache entry
 * @access  Private (admin only)
 */
router.put(
  '/lyrics/:sourceId',
  authenticate,
  adminAuth,
  [
    body('title').optional().trim().isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('artist').optional().trim().isLength({ max: 200 }).withMessage('Artist cannot exceed 200 characters'),
    body('provider').optional().trim().isLength({ max: 80 }).withMessage('Provider cannot exceed 80 characters'),
    body('status').optional().isIn(['found', 'empty']).withMessage('Invalid lyrics status'),
    body('lines').isArray().withMessage('Lines must be an array'),
    body('lines.*.text').isString().trim().isLength({ min: 1 }).withMessage('Line text is required'),
    body('lines.*.start').isFloat({ min: 0 }).withMessage('Line start must be a positive number'),
    body('lines.*.duration').optional().isFloat({ min: 0 }).withMessage('Line duration must be a positive number')
  ],
  validate,
  adminController.updateLyricsCache
);

/**
 * @route   DELETE /api/admin/lyrics/:sourceId
 * @desc    Delete lyrics cache entry
 * @access  Private (admin only)
 */
router.delete('/lyrics/:sourceId', authenticate, adminAuth, adminController.deleteLyricsCache);

module.exports = router;
