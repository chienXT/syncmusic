const axios = require('axios');
const logger = require('../utils/logger');

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const MUSIC_CATEGORY_ID = '10';
const REGION_CODE = 'VN';
const LANGUAGE_CODE = 'vi';
const DEFAULT_MAX_RESULTS = 15;
const CACHE_TTL_MS = 1000 * 30;
const cache = new Map();
let quotaCooldownExpiresAt = 0;

const STRICT_EXCLUDE_REGEX = /\b(shorts|tiktok|reaction|fanmade|audio only|lyrics video|lyric video|karaoke)\b/i;
const STRONG_PENALTY_REGEX = /\b(live|remix|cover|reaction|karaoke|slowed|reverb|fanmade|tiktok|shorts)\b/i;
const PREFERENCE_KEYWORDS = [
  'official',
  'audio',
  'mv',
  'topic',
  'vevo',
];

function normalize(text = '') {
  return text.trim().toLowerCase();
}

function buildBoostedQuery(query, officialOnly = false) {
  const cleaned = normalize(query);
  if (!officialOnly) {
    return cleaned;
  }
  const extras = ['official audio', 'official mv', 'topic channel', 'official music video'];
  return `${cleaned} ${extras.join(' ')}`;
}

function parseDuration(duration) {
  if (!duration) return 0;
  const hoursMatch = duration.match(/(\d+)H/);
  const minutesMatch = duration.match(/(\d+)M/);
  const secondsMatch = duration.match(/(\d+)S/);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
  const seconds = secondsMatch ? Number(secondsMatch[1]) : 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function extractArtist(title, channelTitle) {
  const cleanedTitle = title.replace(/[\[\(].*?[\]\)]/g, '').trim();
  
  const patterns = [
    /^(?<artist>.+?)\s*[-–:•|]\s*(?<title>.+)$/,
    /^(?<artist>.+?)\sby\s.+$/i,
  ];

  for (const pattern of patterns) {
    const match = cleanedTitle.match(pattern);
    if (match?.groups?.artist && match?.groups?.title) {
      // Nếu khớp mẫu "Artist - Title", ta lấy Artist
      return match.groups.artist.trim();
    }
  }

  if (/topic/i.test(channelTitle)) {
    return channelTitle.replace(/\s*\b(topic|official|vevo)\b/gi, '').trim() || channelTitle;
  }

  return channelTitle || 'Unknown Artist';
}

function titleScore(title) {
  const normalized = normalize(title);
  let score = 0;

  if (/\bofficial\b/.test(normalized)) score += 35;
  if (/\baudio\b/.test(normalized)) score += 25;
  if (/\bmv\b/.test(normalized)) score += 20;
  if (/\bvideo\b/.test(normalized)) score += 10;
  if (/\bremix\b/.test(normalized)) score -= 25;
  if (/\blive\b/.test(normalized)) score -= 25;
  if (/\bcover\b/.test(normalized)) score -= 30;
  if (/\bkaraoke\b/.test(normalized)) score -= 30;
  if (/\bslowed\b/.test(normalized)) score -= 20;
  if (/\breverb\b/.test(normalized)) score -= 20;
  if (/\b(tiktok|reaction|fanmade|shorts)\b/.test(normalized)) score -= 40;
  if (/\blyrics?\b/.test(normalized) && !/official lyric|official lyrics/i.test(normalized)) score -= 25;

  return score;
}

function channelScore(channelTitle) {
  const normalized = normalize(channelTitle);
  let score = 0;
  if (/\b(topic|official|vevo)\b/.test(normalized)) score += 35;
  if (/\b(artist|band|records|records|music)\b/.test(normalized)) score += 10;
  if (/\b(official|topic|vevo)\b/.test(normalized)) score += 20;
  if (/\b(shorts|reaction|tiktok|fanmade)\b/.test(normalized)) score -= 40;
  return score;
}

function durationScore(duration) {
  if (duration >= 120 && duration <= 480) return 35;
  if (duration >= 60 && duration <= 900) return 10;
  return -30;
}

function popularityScore(views) {
  if (!views || views <= 0) return 0;
  return Math.min(40, Math.log10(views) * 7);
}

function computeScore({ title, channelTitle, duration, views, publishedAt }) {
  let score = 0;
  score += titleScore(title);
  score += channelScore(channelTitle);
  score += durationScore(duration);
  score += popularityScore(views);

  if (publishedAt) {
    const ageYears = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24 * 365));
    if (ageYears <= 2) score += 5;
    else if (ageYears > 10) score -= 5;
  }

  return Math.round(score);
}

function shouldExclude(title, channelTitle, duration) {
  const normalizedTitle = normalize(title);
  const normalizedChannel = normalize(channelTitle);

  if (STRICT_EXCLUDE_REGEX.test(normalizedTitle) || STRICT_EXCLUDE_REGEX.test(normalizedChannel)) {
    return true;
  }

  if (duration < 60 || duration > 900) {
    return true;
  }

  if (/\b(shorts)\b/i.test(normalizedTitle) || /\b(shorts)\b/i.test(normalizedChannel)) {
    return true;
  }

  return false;
}

function cacheKey(query, pageToken, limit) {
  return `${query}::${pageToken || 'first'}::${limit}`;
}

function tryCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key, value) {
  cache.set(key, { value, createdAt: Date.now() });
}

function sanitizeErrorMessage(message) {
  return String(message)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function searchTracks(query, options = {}) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    const message = 'YouTube API key is not configured';
    logger.error('Music search error:', message);
    return { success: false, error: { message, status: 500 } };
  }

  const now = Date.now();
  if (quotaCooldownExpiresAt > now) {
    logger.debug('YouTube quota cooldown active until %s', new Date(quotaCooldownExpiresAt).toISOString());
    return {
      success: false,
      error: {
        message: 'YouTube quota temporarily unavailable',
        status: 503,
        isQuota: true,
        isCooldown: true,
      },
    };
  }

  const limit = options.limit || DEFAULT_MAX_RESULTS;
  const pageToken = options.pageToken || null;
  const officialOnly = Boolean(options.officialOnly);
  const searchQuery = buildBoostedQuery(query, officialOnly);
  const key = cacheKey(searchQuery, pageToken, limit);
  const cached = tryCache(key);
  if (cached) {
    return { success: true, data: cached };
  }

  try {
    const searchResponse = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q: searchQuery,
        type: 'video',
        maxResults: limit,
        videoCategoryId: MUSIC_CATEGORY_ID,
        regionCode: REGION_CODE,
        relevanceLanguage: LANGUAGE_CODE,
        key: apiKey,
        pageToken: pageToken || undefined,
      },
    });

    const videoIds = (searchResponse.data.items || [])
      .map((item) => item.id?.videoId)
      .filter(Boolean);

    if (!videoIds.length) {
      return { success: true, data: { songs: [], nextPageToken: null, pageToken } };
    }

    const detailsResponse = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        part: 'snippet,contentDetails,statistics',
        id: videoIds.join(','),
        key: apiKey,
      },
    });

    const songs = (detailsResponse.data.items || [])
      .map((video) => {
        const title = video.snippet.title;
        const channelTitle = video.snippet.channelTitle;
        const duration = parseDuration(video.contentDetails.duration);
        const views = Number(video.statistics.viewCount || 0);
        const verified = /\b(topic|official|vevo)\b/i.test(channelTitle) || /\bofficial\b/i.test(title);
        const score = computeScore({
          title,
          channelTitle,
          duration,
          views,
          publishedAt: video.snippet.publishedAt,
        });

        return {
          videoId: video.id,
          sourceId: video.id,
          title,
          artist: extractArtist(title, channelTitle),
          thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '',
          coverArt: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '',
          duration,
          views,
          verified,
          score,
          source: 'youtube',
          publishedAt: video.snippet.publishedAt,
          channelTitle,
        };
      })
      .filter((item) => {
        if (shouldExclude(item.title, item.channelTitle, item.duration)) return false;
        if (officialOnly) {
          return item.verified || /\bofficial\b/i.test(item.title) || /\bofficial\b/i.test(item.channelTitle);
        }
        return true;
      });

    const sortedSongs = songs
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.views - a.views;
      })
      .slice(0, limit);

    const result = {
      songs: sortedSongs,
      nextPageToken: searchResponse.data.nextPageToken || null,
      pageToken,
    };

    setCache(key, result);
    return { success: true, data: result };
  } catch (error) {
    const rawMessage = error.response?.data?.error?.message || error.message || 'YouTube search failed';
    const message = sanitizeErrorMessage(rawMessage);
    const status = error.response?.status || 500;
    const isQuota = status === 403 || /quota/i.test(message);

    if (isQuota) {
      quotaCooldownExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes cooldown
      logger.warn('Music search quota hit: %s. Switching to fallback for 5 minutes.', message);
    } else {
      logger.error('Music search error: %s', message);
    }

    return { success: false, error: { message, status, isQuota } };
  }
}

module.exports = {
  searchTracks,
};
