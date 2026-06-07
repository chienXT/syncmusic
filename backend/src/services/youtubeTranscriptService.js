const { YoutubeTranscript } = require('youtube-transcript');
const logger = require('../utils/logger');
const axios = require('axios');

const shouldKeepTranscriptLine = (text) => {
  if (!text) return false;

  const normalized = String(text).trim();
  if (!normalized) return false;
  if (normalized.length <= 1) return false;

  return !/^\[(music|applause|laughter)\]$/i.test(normalized);
};

/**
 * Làm sạch tên bài hát/ca sĩ để tăng tỷ lệ khớp trên LRCLIB
 */
const cleanSearchTerm = (term) => {
  if (!term) return '';
  return term
    .replace(/(\[|\()(Official|MV|Video|Audio|Lyrics|HD|Full Song|Music Video|Lyric Video|4K|Special Video|Performance).*?(\]|\))/gi, '')
    .replace(/\b(MV|OFFICIAL|HD|4K|LYRICS)\b/gi, '')
    .replace(/「.*?」/g, '')
    .replace(/【.*?】/g, '')
    .replace(/『.*?』/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .trim();
};

/**
 * Lấy lời bài hát đã đồng bộ từ LRCLIB (Nguồn bên ngoài)
 */
async function getExternalSyncedLyrics(title, artist) {
  try {
    if (!title) return null;
    
    const cleanTitle = cleanSearchTerm(title);
    const cleanArtist = cleanSearchTerm(artist);

    logger.info(`Searching external lyrics for: ${cleanTitle} - ${cleanArtist}`);
    const response = await axios.get('https://lrclib.net/api/get', {
      params: { track_name: cleanTitle, artist_name: cleanArtist },
      timeout: 5000
    });

    if (response.data && response.data.syncedLyrics) {
      // Chuyển đổi định dạng LRC sang mảng [{text, start, duration}]
      const lines = response.data.syncedLyrics.split('\n');
      const result = lines.map(line => {
        const match = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
        if (!match) return null;
        
        const minutes = parseInt(match[1]);
        const seconds = parseFloat(match[2]);
        return {
          text: match[3].trim(),
          start: minutes * 60 + seconds,
          duration: 3 // Mặc định thời gian hiển thị
        };
      }).filter(line => line !== null && line.text !== '');
      
      return result.length > 0 ? result : null;
    }
    return null;
  } catch (error) {
    logger.debug(`External lyrics not found for ${title}: ${error.message}`);
    return null;
  }
}

async function getYoutubeLyrics(videoId) {
  try {
    // Try Vietnamese first, then English
    let transcript = null;
    
    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'vi' });
    } catch (viError) {
      logger.debug(`Vietnamese caption not available for ${videoId}, trying English`);
      try {
        transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
      } catch (enError) {
        logger.warn(`No transcript found for ${videoId} (tried vi, en)`);
        return [];
      }
    }

    if (!Array.isArray(transcript)) {
      return [];
    }

    return transcript
      .map((item) => ({
        text: String(item?.text || '').trim(),
        start: Number(item?.offset || 0) / 1000,
        duration: Number(item?.duration || 0),
      }))
      .filter((item) => shouldKeepTranscriptLine(item.text));
  } catch (error) {
    logger.warn(`YouTube transcript error for ${videoId}: ${error.message}`);
    return [];
  }
}

module.exports = {
  getYoutubeLyrics,
  getExternalSyncedLyrics
};