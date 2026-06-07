const express = require('express');
const router = express.Router();
const lyricsController = require('./lyrics.controller');

router.get('/video/:videoId', lyricsController.fetchVideoLyrics);
router.get('/song/:songId', lyricsController.fetchSongLyrics);

module.exports = router;
