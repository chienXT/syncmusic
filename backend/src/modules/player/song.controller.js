const Song = require('../../models/Song');
const Lyrics = require('../../models/Lyrics');
const Room = require('../../models/Room');
const User = require('../../models/User');
const { AppError, NotFoundError, BadRequestError, ForbiddenError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const youtubeService = require('../../services/youtubeService');
const musicSearchService = require('../../services/musicSearchService');
const { getYoutubeLyrics, getExternalSyncedLyrics } = require('../../services/youtubeTranscriptService');

const LYRICS_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const buildSongSearchQuery = (query, genre) => {
  const searchQuery = {
    title: { $regex: query || '', $options: 'i' },
  };

  if (genre) {
    searchQuery.genre = genre;
  }

  return searchQuery;
};

const isQuotaError = (error) => {
  if (!error) return false;
  return error.status === 403 || error.isQuota || /quota/i.test(error.message || '');
};

const sendDatabaseSearchResponse = async (res, query, genre, page, limit, fallbackMessage) => {
  const numericLimit = parseInt(limit, 10) || 20;
  const numericPage = parseInt(page, 10) || 1;
  const searchQuery = buildSongSearchQuery(query, genre);

  const songs = await Song.find(searchQuery)
    .skip((numericPage - 1) * numericLimit)
    .limit(numericLimit)
    .sort({ playCount: -1, trendingScore: -1 });

  const total = await Song.countDocuments(searchQuery);

  return res.status(200).json({
    success: true,
    data: {
      songs,
      source: 'database',
      fallback: true,
      fallbackMessage,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit),
      },
    },
  });
};

/**
 * Add song
 */
exports.addSong = async (req, res, next) => {
  try {
    const { title, artist, album, duration, coverArt, audioUrl, source, sourceId, genre, year } = req.body;

    // Check if song already exists
    const existingSong = await Song.findOne({ source, sourceId });
    if (existingSong) {
      return res.status(200).json({
        success: true,
        data: { song: existingSong },
        message: 'Song already exists',
      });
    }

    // If YouTube, fetch additional details
    let finalAudioUrl = audioUrl;
    let finalDuration = duration;

    if (source === 'youtube' && sourceId) {
      const details = await youtubeService.getVideoDetails(sourceId);
      if (!details.success) {
        return next(new AppError(`YouTube video details error: ${details.error?.message || details.error}`, 500));
      }

      finalDuration = details.data.duration;
      const audio = await youtubeService.getAudioUrl(sourceId);
      if (!audio.success) {
        return next(new AppError(`YouTube audio URL error: ${audio.error?.message || audio.error}`, 500));
      }

      finalAudioUrl = audio.data;
    }

    const song = await Song.create({
      title,
      artist,
      album,
      duration: finalDuration,
      coverArt,
      audioUrl: finalAudioUrl,
      source: source || 'custom',
      sourceId,
      genre,
      year,
      addedBy: req.user._id,
      isExplicit: false
    });

    logger.info(`Song added: ${title} by ${artist}`);
    
    res.status(201).json({
      success: true,
      message: 'Song added successfully',
      data: { song }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search songs
 */
exports.searchSongs = async (req, res, next) => {
  try {
    const { query, genre, page = 1, limit = 20, source } = req.query;
    
    // Search from external sources if specified
    if (source === 'youtube' && query) {
      const result = await musicSearchService.searchTracks(query, {
        limit: parseInt(limit, 10) || 20,
        pageToken: req.query.pageToken || null,
        officialOnly: req.query.officialOnly === 'true' || req.query.officialOnly === true,
      });

      if (result.success) {
        return res.status(200).json({
          success: true,
          data: {
            songs: result.data.songs,
            source: 'youtube',
            pagination: {
              nextPageToken: result.data.nextPageToken,
              pageToken: result.data.pageToken,
              hasMore: Boolean(result.data.nextPageToken),
            },
          },
        });
      }

      const errorMessage = typeof result.error === 'string' ? result.error : result.error?.message || 'YouTube search failed';
      const statusCode = typeof result.error === 'object' && result.error?.status ? result.error.status : 500;

      if (isQuotaError(result.error)) {
        return await sendDatabaseSearchResponse(
          res,
          query,
          genre,
          page,
          limit,
          'YouTube quota exceeded. Returning local matches instead.'
        );
      }

      return next(new AppError(errorMessage, statusCode));
    }

    // Default: search from database
    const searchQuery = {
      title: { $regex: query || '', $options: 'i' },
    };

    if (genre) {
      searchQuery.genre = genre;
    }

    const songs = await Song.find(searchQuery)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ playCount: -1, trendingScore: -1 });

    const total = await Song.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: {
        songs,
        source: 'database',
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get song by ID
 */
exports.getSong = async (req, res, next) => {
  try {
    const { songId } = req.params;
    
    const song = await Song.findById(songId).populate('addedBy', 'username');
    
    if (!song) {
      throw new NotFoundError('Song not found');
    }
    
    res.json({
      success: true,
      data: { song }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get trending songs
 */
exports.getTrendingSongs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const songs = await Song.find()
      .populate('addedBy', 'username')
      .sort({ trendingScore: -1, playCount: -1 })
      .limit(limit);
    
    res.json({
      success: true,
      data: { songs }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get synced lyrics for a YouTube video
 */
exports.getLyrics = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const title = String(req.query.title || '');
    const artist = String(req.query.artist || '');

    if (!videoId) {
      throw new BadRequestError('Video ID is required');
    }

    const cachedLyrics = await Lyrics.findOne({
      source: 'youtube',
      sourceId: videoId,
    }).lean();

    if (cachedLyrics) {
      const isFresh = Date.now() - new Date(cachedLyrics.fetchedAt).getTime() < LYRICS_CACHE_TTL_MS;
      if (isFresh) {
        return res.json({
          success: true,
          data: {
            lyrics: cachedLyrics.lines,
            source: cachedLyrics.provider,
            cached: true,
            status: cachedLyrics.status,
          },
        });
      }
    }

    // Bước 1: Thử lấy từ nguồn bên ngoài (LRCLIB) bằng title/artist
    let lyrics = await getExternalSyncedLyrics(title, artist);
    let provider = 'lrclib';

    // Bước 2: Nếu không có, fallback về YouTube Transcript
    if (!lyrics || lyrics.length === 0) {
      lyrics = await getYoutubeLyrics(videoId);
      provider = 'youtube_transcript';
    }

    await Lyrics.findOneAndUpdate(
      { source: 'youtube', sourceId: videoId },
      {
        source: 'youtube',
        sourceId: videoId,
        title,
        artist,
        lines: lyrics,
        provider: provider,
        status: lyrics.length ? 'found' : 'empty',
        fetchedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      data: {
        lyrics,
        source: lyrics.length ? provider : 'none',
        cached: false,
        status: lyrics.length ? 'found' : 'empty',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update song play count
 */
exports.incrementPlayCount = async (req, res, next) => {
  try {
    const { songId } = req.params;

    const song = await Song.findByIdAndUpdate(
      songId,
      { $inc: { playCount: 1 } },
      { new: true }
    );

    if (!song) {
      throw new NotFoundError('Song not found');
    }

    res.json({
      success: true,
      data: { song }
    });
  } catch (error) {
    next(error);
  }
};

exports.getTopPlayedSongs = async (req, res, next) => {
  try {
    const limit = Math.min(10, Math.max(1, parseInt(req.query.limit) || 10));
    const songs = await Song.find()
      .populate('addedBy', 'username')
      .sort({ playCount: -1, trendingScore: -1, createdAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: { songs }
    });
  } catch (error) {
    next(error);
  }
};

exports.getTopLikedSongs = async (req, res, next) => {
  try {
    const limit = Math.min(10, Math.max(1, parseInt(req.query.limit) || 10));
    const songs = await Song.find()
      .populate('addedBy', 'username')
      .sort({ likeCount: -1, playCount: -1, createdAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: { songs }
    });
  } catch (error) {
    next(error);
  }
};

exports.playSongInRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { songId } = req.body;

    if (!roomId || !songId) {
      throw new BadRequestError('Room ID and Song ID are required');
    }

    const room = await Room.findById(roomId);
    if (!room) {
      throw new NotFoundError('Room not found');
    }

    if (room.host.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('Only host can play songs immediately');
    }

    const song = await Song.findById(songId);
    if (!song) {
      throw new NotFoundError('Song not found');
    }

    if (!room.playback) room.playback = {};
    room.playback.currentSong = song._id;
    room.playback.currentTime = 0;
    room.playback.isPlaying = true;
    room.playback.lastUpdateTime = Date.now();

    const queueIds = (room.queue || []).map((id) => id.toString());
    room.queue = room.queue.filter((id) => id.toString() !== song._id.toString());

    if (!queueIds.includes(song._id.toString())) {
      room.stats = room.stats || {};
      room.stats.songsPlayed = (room.stats.songsPlayed || 0) + 1;
    }

    await room.save();
    await Song.findByIdAndUpdate(song._id, { $inc: { playCount: 1 } });

    const io = req.app.get('io');
    if (io) {
      const updatedRoom = await Room.findById(roomId)
        .populate('host', 'username avatar status')
        .populate('moderators', 'username avatar')
        .populate('participants.user', 'username avatar status')
        .populate('playback.currentSong', 'title artist album duration coverArt audioUrl source sourceId')
        .populate('queue', 'title artist album duration coverArt audioUrl source sourceId');

      if (updatedRoom) {
        io.to(roomId).emit('room_updated', { room: updatedRoom });
        io.to(roomId).emit('song_changed', {
          song,
          currentTime: 0,
          isPlaying: true,
          timestamp: Date.now(),
          isHostAction: true
        });
      }
    }

    res.json({
      success: true,
      message: 'Song is now playing in room',
      data: { room }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add song to room queue
 */
exports.addToQueue = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { songId } = req.body;
    
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw new NotFoundError('Room not found');
    }
    
    // Check if user is a room participant
    const isParticipant = room.participants.some(p => p.user.toString() === req.user._id.toString());
    if (!isParticipant && room.host.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('Only room participants can add songs to queue');
    }
    
    // Check if queueing is allowed
    if (!room.settings.allowQueue) {
      throw new BadRequestError('Adding to queue is disabled in this room');
    }
    
    const song = await Song.findById(songId);
    
    if (!song) {
      throw new NotFoundError('Song not found');
    }
    
    // Add to queue if not already present
    const isAlreadyInQueue = room.queue.some((id) => id.toString() === songId.toString());
    const isCurrentSong = room.playback?.currentSong?.toString?.() === songId.toString();

    if (isAlreadyInQueue || isCurrentSong) {
      return res.json({
        success: true,
        message: 'Bài hát đã có trong danh sách chờ',
        data: { room, alreadyInQueue: true }
      });
    }

    const shouldStartPlaying = !room.playback.currentSong;
    if (shouldStartPlaying) {
      room.playback.currentSong = songId;
      room.playback.currentTime = 0;
      room.playback.isPlaying = true;
      room.playback.lastUpdateTime = Date.now();
      logger.info(`Starting playback for song: ${song.title} (source: ${song.source}, sourceId: ${song.sourceId})`);
    } else {
      room.queue.push(songId);
    }

    await room.save();
    
    // Broadcast queue update to all connected room clients
    const io = req.app.get('io');
    if (io) {
      try {
        const updatedRoom = await Room.findById(roomId)
          .populate('host', 'username avatar status')
          .populate('moderators', 'username avatar')
          .populate('participants.user', 'username avatar status')
          .populate('playback.currentSong', 'title artist album duration coverArt audioUrl source sourceId')
          .populate('queue', 'title artist album duration coverArt audioUrl source sourceId');

        if (updatedRoom) {
          logger.info(`Emitting room_updated event to room ${roomId}`);
          io.to(roomId).emit('room_updated', {
            room: updatedRoom
          });
        }
      } catch (err) {
        logger.error('Failed to emit room_updated event:', err);
      }
    } else {
      logger.error('Socket.io instance not available');
    }
    
    // Emit socket event if song started playing
    if (shouldStartPlaying) {
      if (io) {
        logger.info(`Emitting song_changed event to room ${roomId}`);
        io.to(roomId).emit('song_changed', {
          song: song,
          currentTime: 0,
          isPlaying: true,
          timestamp: Date.now()
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Song added to queue',
      data: { room, alreadyInQueue: false }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove song from room queue
 */
exports.removeFromQueue = async (req, res, next) => {
  try {
    const { roomId, songId } = req.params;
    
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw new NotFoundError('Room not found');
    }
    
    // Check if user is host or moderator
    const isHost = room.host.toString() === req.user._id.toString();
    const isModerator = room.moderators.some(m => m.toString() === req.user._id.toString());
    
    if (!isHost && !isModerator) {
      throw new ForbiddenError('Only host or moderators can remove from queue');
    }
    
    room.queue = room.queue.filter(id => id.toString() !== songId);
    await room.save();

    const io = req.app.get('io');
    if (io) {
      try {
        const updatedRoom = await Room.findById(roomId)
          .populate('host', 'username avatar status')
          .populate('moderators', 'username avatar')
          .populate('participants.user', 'username avatar status')
          .populate('playback.currentSong', 'title artist album duration coverArt audioUrl source sourceId')
          .populate('queue', 'title artist album duration coverArt audioUrl source sourceId');

        if (updatedRoom) {
          io.to(roomId).emit('room_updated', {
            room: updatedRoom
          });
        }
      } catch (err) {
        logger.error('Failed to emit room_updated event:', err);
      }
    }
    
    res.json({
      success: true,
      message: 'Song removed from queue',
      data: { room }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get room queue
 */
exports.getQueue = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findById(roomId)
      .populate('queue', 'title artist album duration coverArt addedBy')
      .populate('playback.currentSong', 'title artist album duration coverArt');
    
    if (!room) {
      throw new NotFoundError('Room not found');
    }
    
    res.json({
      success: true,
      data: {
        currentSong: room.playback.currentSong,
        queue: room.queue
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Like a song
 */
exports.likeSong = async (req, res, next) => {
  try {
    const { songId } = req.params;
    const userId = req.user._id;

    const song = await Song.findById(songId);
    if (!song) throw new NotFoundError('Song not found');

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    // Check if already liked
    const alreadyLiked = user.likedSongs.some(id => id.toString() === songId);
    if (alreadyLiked) {
      return res.json({
        success: true,
        message: 'Bài hát đã được thích',
        data: { alreadyLiked: true, likeCount: song.likeCount }
      });
    }

    user.likedSongs.push(songId);
    song.likeCount = (song.likeCount || 0) + 1;
    await user.save();
    await song.save();

    res.json({
      success: true,
      message: 'Đã thích bài hát',
      data: { alreadyLiked: false, likeCount: song.likeCount }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unlike a song
 */
exports.unlikeSong = async (req, res, next) => {
  try {
    const { songId } = req.params;
    const userId = req.user._id;

    const song = await Song.findById(songId);
    if (!song) throw new NotFoundError('Song not found');

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const index = user.likedSongs.findIndex(id => id.toString() === songId);
    if (index === -1) {
      return res.json({
        success: true,
        message: 'Bài hát chưa được thích',
        data: { alreadyLiked: false, likeCount: song.likeCount }
      });
    }

    user.likedSongs.splice(index, 1);
    song.likeCount = Math.max(0, (song.likeCount || 0) - 1);
    await user.save();
    await song.save();

    res.json({
      success: true,
      message: 'Đã bỏ thích bài hát',
      data: { likeCount: song.likeCount }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if current user liked a song
 */
exports.checkLikeStatus = async (req, res, next) => {
  try {
    const { songId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId).select('likedSongs');
    if (!user) throw new NotFoundError('User not found');

    const song = await Song.findById(songId).select('likeCount');
    if (!song) throw new NotFoundError('Song not found');

    const liked = user.likedSongs.some(id => id.toString() === songId);

    res.json({
      success: true,
      data: { liked, likeCount: song.likeCount }
    });
  } catch (error) {
    next(error);
  }
};
