const User = require('../../models/User');
const Room = require('../../models/Room');
const Lyrics = require('../../models/Lyrics');
const Song = require('../../models/Song');
const { ForbiddenError, NotFoundError, BadRequestError } = require('../../utils/errors');
const logger = require('../../utils/logger');

/**
 * Get all users (admin only)
 */
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .populate('currentRoom', 'name inviteCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set user role (admin only)
 */
exports.setUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'moderator', 'admin'].includes(role)) {
      throw new BadRequestError('Invalid role');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    logger.info(`${req.user.username} set ${user.username} role to ${role}`);

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system stats (admin only)
 */
exports.getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const onlineUsers = await User.countDocuments({ isOnline: true });
    const totalRooms = await Room.countDocuments();
    const activeRooms = await Room.countDocuments({ isActive: true });
    const admins = await User.countDocuments({ role: 'admin' });
    const moderators = await User.countDocuments({ role: 'moderator' });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          online: onlineUsers,
          admins,
          moderators
        },
        rooms: {
          total: totalRooms,
          active: activeRooms
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search users (admin only)
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 1) {
      throw new BadRequestError('Search query required');
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
      .select('-password')
      .limit(20);

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin dashboard data
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const stats = {
      totalUsers: await User.countDocuments(),
      onlineUsers: await User.countDocuments({ isOnline: true }),
      totalRooms: await Room.countDocuments(),
      activeRooms: await Room.countDocuments({ isActive: true }),
      admins: await User.countDocuments({ role: 'admin' }),
      moderators: await User.countDocuments({ role: 'moderator' })
    };

    const recentUsers = await User.find()
      .select('username email role status createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    const activeRoomsData = await Room.find({ isActive: true })
      .populate('host', 'username avatar')
      .select('name host participants stats createdAt')
      .sort({ updatedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        stats,
        recentUsers,
        activeRooms: activeRoomsData
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all rooms (admin only)
 */
exports.getRooms = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search?.toString().trim();

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { inviteCode: { $regex: search, $options: 'i' } }
      ];
    }

    const rooms = await Room.find(filter)
      .populate('host', 'username email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Room.countDocuments(filter);

    res.json({
      success: true,
      data: {
        rooms,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a room (admin only)
 */
exports.updateRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const {
      name,
      description,
      isPrivate,
      maxParticipants,
      isActive,
      tags,
      host
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
    if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags)
        ? tags.map((tag) => tag.toString().trim()).filter(Boolean)
        : tags.toString().split(',').map((tag) => tag.trim()).filter(Boolean);
    }
    if (host !== undefined) {
      const hostUser = await User.findById(host);
      if (!hostUser) {
        throw new NotFoundError('Host user not found');
      }
      updateData.host = host;
    }

    const room = await Room.findByIdAndUpdate(roomId, updateData, { new: true })
      .populate('host', 'username email avatar');

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    res.json({
      success: true,
      message: 'Room updated successfully',
      data: { room }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a room (admin only)
 */
exports.deleteRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findByIdAndDelete(roomId);

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    await User.updateMany({ currentRoom: roomId }, { currentRoom: null });

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get cached lyrics entries (admin only)
 */
exports.getLyricsCache = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const search = req.query.search?.toString().trim();

    const filter = {};
    if (search) {
      filter.$or = [
        { sourceId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } },
      ];
    }

    const entries = await Lyrics.find(filter)
      .sort({ fetchedAt: -1 })
      .limit(limit)
      .lean();

    const sourceIds = entries.map((entry) => entry.sourceId).filter(Boolean);
    const songs = sourceIds.length
      ? await Song.find({ sourceId: { $in: sourceIds } }).select('title artist sourceId coverArt').lean()
      : [];
    const songBySourceId = new Map(songs.map((song) => [song.sourceId, song]));
    const hydratedEntries = entries.map((entry) => {
      const song = songBySourceId.get(entry.sourceId);
      return {
        ...entry,
        title: entry.title || song?.title || '',
        artist: entry.artist || song?.artist || '',
        songTitle: song?.title || entry.title || '',
        songArtist: song?.artist || entry.artist || '',
        coverArt: song?.coverArt || null,
      };
    });

    res.json({
      success: true,
      data: {
        entries: hydratedEntries,
        total: hydratedEntries.length,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update lyrics cache entry (admin only)
 */
exports.updateLyricsCache = async (req, res, next) => {
  try {
    const { sourceId } = req.params;
    const { title, artist, provider, status, lines } = req.body;

    if (!sourceId) {
      throw new BadRequestError('sourceId is required');
    }

    if (!Array.isArray(lines)) {
      throw new BadRequestError('lines must be an array');
    }

    const normalizedLines = lines
      .map((line) => ({
        text: line?.text?.toString().trim(),
        start: Number(line?.start),
        duration: Number(line?.duration || 0)
      }))
      .filter((line) => line.text && Number.isFinite(line.start) && line.start >= 0)
      .map((line) => ({
        ...line,
        duration: Number.isFinite(line.duration) && line.duration >= 0 ? line.duration : 0
      }));

    const updateData = {
      lines: normalizedLines,
      status: status || (normalizedLines.length > 0 ? 'found' : 'empty'),
      fetchedAt: new Date()
    };

    if (title !== undefined) updateData.title = title.toString().trim();
    if (artist !== undefined) updateData.artist = artist.toString().trim();
    if (provider !== undefined) updateData.provider = provider.toString().trim() || 'manual_admin';

    const entry = await Lyrics.findOneAndUpdate(
      { sourceId },
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!entry) {
      throw new NotFoundError('Lyrics cache entry not found');
    }

    const songUpdateData = {};
    if (updateData.title) songUpdateData.title = updateData.title;
    if (updateData.artist) songUpdateData.artist = updateData.artist;

    if (Object.keys(songUpdateData).length > 0) {
      await Song.updateMany({ sourceId }, songUpdateData);
    }

    logger.info(`${req.user.username} updated lyrics cache for ${sourceId}`);

    res.json({
      success: true,
      message: `Updated lyrics cache for ${sourceId}`,
      data: { entry }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete lyrics cache entry (admin only)
 */
exports.deleteLyricsCache = async (req, res, next) => {
  try {
    const { sourceId } = req.params;

    if (!sourceId) {
      throw new BadRequestError('sourceId is required');
    }

    const result = await Lyrics.deleteOne({ sourceId });

    if (result.deletedCount === 0) {
      throw new NotFoundError('Lyrics cache entry not found');
    }

    res.json({
      success: true,
      message: `Deleted lyrics cache for ${sourceId}`,
      data: {
        sourceId,
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    next(error);
  }
};
