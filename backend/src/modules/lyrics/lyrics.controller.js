const { getYoutubeLyrics } = require('../../services/youtubeTranscriptService');

exports.fetchVideoLyrics = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const lyrics = await getYoutubeLyrics(videoId);
    res.json({
      success: true,
      data: { lyrics }
    });
  } catch (error) {
    next(error);
  }
};

exports.fetchSongLyrics = async (req, res, next) => {
  try {
    const { songId } = req.params;
    const lyrics = await getYoutubeLyrics(songId);
    res.json({
      success: true,
      data: { lyrics }
    });
  } catch (error) {
    next(error);
  }
};
