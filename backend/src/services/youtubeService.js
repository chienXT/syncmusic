const axios = require('axios');
const logger = require('../utils/logger');

/**
 * YouTube Service for searching and fetching song information
 */
class YouTubeService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
  }

  /**
   * Search for songs on YouTube
   */
  async search(query, maxResults = 10) {
    if (!this.apiKey) {
      const message = 'YouTube API key is not configured';
      logger.error('YouTube search error:', message);
      return { success: false, error: { message, status: 500 } };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults,
          key: this.apiKey,
        },
      });

      const songs = response.data.items.map((item) => ({
        title: item.snippet.title,
        artist: this.extractArtist(item.snippet.title),
        album: '',
        duration: 0, // Will be fetched separately
        coverArt: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
        audioUrl: null,
        source: 'youtube',
        sourceId: item.id.videoId,
        genre: '',
        year: new Date().getFullYear(),
      }));

      return { success: true, data: songs };
    } catch (error) {
      const message = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      const status = error.response?.status || 500;
      logger.error('YouTube search error:', message);
      return { success: false, error: { message, status } };
    }
  }

  /**
   * Get video details including duration
   */
  async getVideoDetails(videoId) {
    if (!this.apiKey) {
      const message = 'YouTube API key is not configured';
      logger.error('YouTube video details error:', message);
      return { success: false, error: { message, status: 500 } };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          part: 'contentDetails,snippet',
          id: videoId,
          key: this.apiKey,
        },
      });

      const video = response.data.items[0];
      const duration = this.parseDuration(video.contentDetails.duration);

      return {
        success: true,
        data: {
          duration,
          title: video.snippet.title,
          artist: this.extractArtist(video.snippet.title),
          coverArt: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url,
        },
      };
    } catch (error) {
      const message = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      const status = error.response?.status || 500;
      logger.error('YouTube video details error:', message);
      return { success: false, error: { message, status } };
    }
  }

  /**
   * Get video URL for playback
   * Returns the YouTube video URL directly for frontend to handle
   */
  async getAudioUrl(videoId) {
    try {
      // Return the YouTube video URL directly
      // Frontend will use YouTube embed or iframe for playback
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      return {
        success: true,
        data: videoUrl,
      };
    } catch (error) {
      const message = error.message || 'Failed to retrieve YouTube video URL';
      logger.error('YouTube video URL error:', message);
      return { success: false, error: { message, status: 500 } };
    }
  }

  /**
   * Parse YouTube duration format (PT4M13S -> 253 seconds)
   */
  parseDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Extract artist from video title (simple heuristic)
   */
  extractArtist(title) {
    // Common patterns: "Artist - Song", "Artist: Song", "Artist • Song"
    const patterns = [
      /^(.+?)\s[-–:•]\s.+$/,
      /^(.+?)\sby\s.+$/i,
    ];
    
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return 'Unknown';
  }
}

module.exports = new YouTubeService();
