const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const playlistController = require('./playlist.controller');
const { authenticate, optionalAuth } = require('../../middleware/auth');
const { validate } = require('../../middleware/validation');
const { apiLimiter } = require('../../middleware/rateLimit');

/**
 * @route   POST /api/playlists
 * @desc    Create a new playlist
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  apiLimiter,
  [
    body('name').trim().notEmpty().withMessage('Playlist name is required'),
    body('description')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Description cannot exceed 200 characters')
  ],
  validate,
  playlistController.createPlaylist
);

/**
 * @route   GET /api/playlists/public
 * @desc    Get public playlists
 * @access  Public
 */
router.get('/public', optionalAuth, playlistController.getPublicPlaylists);

/**
 * @route   GET /api/playlists/me
 * @desc    Get current user's playlists
 * @access  Private
 */
router.get('/me', authenticate, playlistController.getUserPlaylists);

/**
 * @route   GET /api/playlists/user/:userId
 * @desc    Get user's playlists
 * @access  Public
 */
router.get('/user/:userId', optionalAuth, playlistController.getUserPlaylists);

/**
 * @route   GET /api/playlists/:playlistId
 * @desc    Get playlist by ID
 * @access  Public
 */
router.get('/:playlistId', optionalAuth, playlistController.getPlaylist);

/**
 * @route   PUT /api/playlists/:playlistId
 * @desc    Update playlist
 * @access  Private (owner only)
 */
router.put(
  '/:playlistId',
  authenticate,
  apiLimiter,
  playlistController.updatePlaylist
);

/**
 * @route   DELETE /api/playlists/:playlistId
 * @desc    Delete playlist
 * @access  Private (owner only)
 */
router.delete('/:playlistId', authenticate, playlistController.deletePlaylist);

/**
 * @route   POST /api/playlists/:playlistId/songs
 * @desc    Add song to playlist
 * @access  Private (owner only)
 */
router.post(
  '/:playlistId/songs',
  authenticate,
  [body('songId').notEmpty().withMessage('Song ID is required')],
  validate,
  playlistController.addSongToPlaylist
);

/**
 * @route   DELETE /api/playlists/:playlistId/songs/:songId
 * @desc    Remove song from playlist
 * @access  Private (owner only)
 */
router.delete('/:playlistId/songs/:songId', authenticate, playlistController.removeSongFromPlaylist);

/**
 * @route   POST /api/playlists/:playlistId/follow
 * @desc    Follow/unfollow playlist
 * @access  Private
 */
router.post('/:playlistId/follow', authenticate, playlistController.toggleFollowPlaylist);

module.exports = router;
