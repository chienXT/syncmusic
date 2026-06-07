const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const songController = require('./song.controller');
const { authenticate, optionalAuth } = require('../../middleware/auth');
const { validate } = require('../../middleware/validation');
const { apiLimiter } = require('../../middleware/rateLimit');

/**
 * @route   POST /api/songs
 * @desc    Add a new song
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  apiLimiter,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('artist').trim().notEmpty().withMessage('Artist is required'),
    body('duration').isNumeric().withMessage('Duration must be a number'),
    body('audioUrl').custom((value, { req }) => {
      const source = req.body.source;
      if (source === 'youtube' || source === 'soundcloud') {
        return true;
      }
      if (!value) {
        throw new Error('Audio URL is required');
      }
      const urlRegex = /^(https?:\/\/)[\w\-]+(\.[\w\-]+)+[/#?]?.*$/;
      if (!urlRegex.test(value)) {
        throw new Error('Audio URL must be valid');
      }
      return true;
    })
  ],
  validate,
  songController.addSong
);

/**
 * @route   GET /api/songs/search
 * @desc    Search songs
 * @access  Public
 */
router.get('/search', optionalAuth, songController.searchSongs);

/**
 * @route   GET /api/songs/trending
 * @desc    Get trending songs
 * @access  Public
 */
router.get('/trending', songController.getTrendingSongs);

/**
 * @route   GET /api/songs/top/played
 * @desc    Get top played songs
 * @access  Public
 */
router.get('/top/played', songController.getTopPlayedSongs);

/**
 * @route   GET /api/songs/top/liked
 * @desc    Get top liked songs
 * @access  Public
 */
router.get('/top/liked', songController.getTopLikedSongs);

/**
 * @route   GET /api/songs/lyrics/:videoId
 * @desc    Get synced lyrics from YouTube transcript
 * @access  Public
 */
router.get('/lyrics/:videoId', optionalAuth, songController.getLyrics);

/**
 * @route   GET /api/songs/:songId/like
 * @desc    Check if current user liked a song
 * @access  Private
 */
router.get('/:songId/like', authenticate, songController.checkLikeStatus);

/**
 * @route   POST /api/songs/:songId/like
 * @desc    Like a song
 * @access  Private
 */
router.post('/:songId/like', authenticate, songController.likeSong);

/**
 * @route   DELETE /api/songs/:songId/like
 * @desc    Unlike a song
 * @access  Private
 */
router.delete('/:songId/like', authenticate, songController.unlikeSong);

/**
 * @route   POST /api/songs/play/:roomId
 * @desc    Play a song immediately in a room
 * @access  Private (host only)
 */
router.post('/play/:roomId', authenticate, songController.playSongInRoom);

/**
 * @route   GET /api/songs/:songId
 * @desc    Get song by ID
 * @access  Public
 */
router.get('/:songId', optionalAuth, songController.getSong);

/**
 * @route   POST /api/songs/:songId/play
 * @desc    Increment song play count
 * @access  Public
 */
router.post('/:songId/play', optionalAuth, songController.incrementPlayCount);

/**
 * @route   POST /api/songs/queue/:roomId
 * @desc    Add song to room queue
 * @access  Private
 */
router.post(
  '/queue/:roomId',
  authenticate,
  [body('songId').notEmpty().withMessage('Song ID is required')],
  validate,
  songController.addToQueue
);

/**
 * @route   DELETE /api/songs/queue/:roomId/:songId
 * @desc    Remove song from room queue
 * @access  Private (host/moderator)
 */
router.delete('/queue/:roomId/:songId', authenticate, songController.removeFromQueue);

/**
 * @route   GET /api/songs/queue/:roomId
 * @desc    Get room queue
 * @access  Public
 */
router.get('/queue/:roomId', optionalAuth, songController.getQueue);

module.exports = router;
