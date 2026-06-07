const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authenticate } = require('../../middleware/auth');
const { apiLimiter } = require('../../middleware/rateLimit');

/**
 * @route   GET /api/users/search
 * @desc    Search users
 * @access  Public
 */
router.get('/search', authenticate, userController.searchUsers);

/**
 * @route   GET /api/users/friend-requests
 * @desc    Get friend requests
 * @access  Private
 */
router.get('/friend-requests', authenticate, userController.getFriendRequests);

/**
 * @route   PUT /api/users/status
 * @desc    Update user status
 * @access  Private
 */
router.put('/status', authenticate, userController.updateStatus);

/**
 * @route   POST /api/users/recently-played
 * @desc    Add to recently played
 * @access  Private
 */
router.post('/recently-played', authenticate, userController.addToRecentlyPlayed);

/**
 * @route   GET /api/users/recently-played
 * @desc    Get recently played
 * @access  Private
 */
router.get('/recently-played', authenticate, userController.getRecentlyPlayed);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user by ID
 * @access  Public
 */
router.get('/:userId', userController.getUser);

/**
 * @route   POST /api/users/:userId/friend-request
 * @desc    Send friend request
 * @access  Private
 */
router.post('/:userId/friend-request', authenticate, apiLimiter, userController.sendFriendRequest);

/**
 * @route GET /api/users/preferences
 * @desc Get user preferences
 * @access Private
 */
router.get('/preferences', authenticate, userController.getPreferences);

/**
 * @route PUT /api/users/preferences
 * @desc Update user preferences
 * @access Private
 */
router.put('/preferences', authenticate, userController.updatePreferences);

module.exports = router;
