const Room = require('../../models/Room');
const User = require('../../models/User');
const Song = require('../../models/Song');
const RoomHistory = require('../../models/RoomHistory');
const mongoose = require('mongoose');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../../utils/errors');
const logger = require('../../utils/logger');

/**
 * Build query to find room by various identifiers
 * @param {string} identifier - Room ID, invite code, or room key
 * @returns {Object} MongoDB query object
 */
const buildRoomIdentifierQuery = (identifier) => {
  const conditions = [
    { inviteCode: identifier },
    { roomKey: identifier }
  ];

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    conditions.push({ _id: identifier });
    conditions.push({ host: identifier });
  }

  return { $or: conditions };
};

/**
 * Populate room with related data
 * @param {string} roomId - Room ID
 * @returns {Promise<Object>} Populated room object
 */
const populateRoom = async (roomId) => {
  return await Room.findById(roomId)
    .populate('host', 'username avatar status currentRoom')
    .populate('moderators', 'username avatar status currentRoom')
    .populate('participants.user', 'username avatar status currentRoom')
    .populate('playback.currentSong', 'title artist album duration coverArt audioUrl source sourceId')
    .populate('queue', 'title artist album duration coverArt audioUrl source sourceId');
};

/**
 * Check if user is host of a room
 * @param {Object} room - Room object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
const isUserHost = (room, userId) => {
  if (!userId) return false;
  const roomHostId = room.host?._id?.toString() || room.host?.toString();
  return roomHostId === userId || room.roomKey === userId;
};

/**
 * Check if user is participant in a room
 * @param {Object} room - Room object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
const isUserParticipant = (room, userId) => {
  if (!userId) return false;
  return room.participants.some(
    p => p.user?._id?.toString() === userId || p.user?.toString() === userId
  );
};

/**
 * Check if user is moderator in a room
 * @param {Object} room - Room object
 * @param {string} userId - User ID
 * @returns {boolean}
 */
const isUserModerator = (room, userId) => {
  if (!userId) return false;
  return room.moderators.some(m => m.toString() === userId);
};

const getOrCreateRoomHistory = async (roomId) => {
  let history = await RoomHistory.findOne({ room: roomId, sessionEnd: null }).sort({ sessionStart: -1 });
  if (!history) {
    history = await RoomHistory.create({ room: roomId, sessionStart: new Date() });
  }
  return history;
};

const appendRoomHistorySong = async (roomId, songId, duration) => {
  if (!songId) return null;
  const history = await getOrCreateRoomHistory(roomId);
  history.songsPlayed.push({ song: songId, playedAt: new Date(), duration });
  await history.save();
  return history;
};

/**
 * Reactivate an inactive room
 * @param {Object} room - Room object
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated room
 */
const reactivateRoom = async (room, updates = {}) => {
  logger.info(`Reactivating room ${room._id} with inviteCode=${room.inviteCode}`);
  
  Object.assign(room, {
    ...updates,
    isActive: true,
    updatedAt: new Date()
  });
  
  await room.save();
  logger.info(`Room reactivated: inviteCode=${room.inviteCode}, isActive=${room.isActive}`);
  
  return room;
};

/**
 * Reset room playback state
 * @param {Object} room - Room object
 */
const resetRoomPlayback = (room) => {
  room.playback = {
    ...room.playback,
    isPlaying: false,
    currentSong: null,
    currentTime: 0,
    lastUpdateTime: new Date(),
    volume: 100
  };
  room.skipVotes = [];
  room.queue = [];
};

/**
 * Create a new room
 */
exports.createRoom = async (req, res, next) => {
  try {
    const { name, description, isPrivate, maxParticipants, tags } = req.body;
    const hostId = req.user._id.toString();

    // Validate required fields
    if (!name || name.trim().length === 0) {
      throw new BadRequestError('Room name is required');
    }

    // Link one stable room to each host user. Reuse it on every create request
    // so one account can own only one music room record.
    let room = await Room.findOne({
      $or: [{ host: req.user._id }, { roomKey: hostId }]
    }).sort({ updatedAt: -1, createdAt: -1 });

    const roomUpdates = {
      name: name.trim(),
      description: description || '',
      isPrivate: Boolean(isPrivate),
      maxParticipants: maxParticipants || 50,
      tags: tags || [],
      host: req.user._id,
      roomKey: hostId,
      moderators: [req.user._id]
    };

    let responseMessage = 'Room created successfully';
    let statusCode = 201;

    if (room) {
      const wasInactive = !room.isActive;

      Object.assign(room, roomUpdates);

      if (wasInactive) {
        room.participants = [{ user: req.user._id }];
        resetRoomPlayback(room);
      } else if (!isUserParticipant(room, hostId)) {
        room.participants.push({ user: req.user._id });
      }

      await reactivateRoom(room);
      responseMessage = 'Bạn đã có phòng nhạc, hệ thống đã mở lại phòng hiện có.';
      statusCode = 200;
    } else {
      // Create the user's only hosted room
      room = await Room.create({
        ...roomUpdates,
        participants: [{ user: req.user._id }]
      });
      logger.info(`Created new room ${room._id} with inviteCode=${room.inviteCode}`);
    }
    
    // Update user's current room
    await User.findByIdAndUpdate(req.user._id, {
      currentRoom: room._id,
      status: 'listening'
    });
    
    // Populate room for response
    room = await populateRoom(room._id);
    
    logger.info(`Room ready: ${room.name} by ${req.user.username}, inviteCode=${room.inviteCode}`);
    
    res.status(statusCode).json({
      success: true,
      message: responseMessage,
      data: { room }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get public site statistics
 */
exports.getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: { $ne: 'offline' } });
    const totalRooms = await Room.countDocuments();
    const activeRooms = await Room.countDocuments({ isActive: true });
    const songsPlayedAgg = await Room.aggregate([
      { $group: { _id: null, totalSongsPlayed: { $sum: '$stats.songsPlayed' } } }
    ]);
    const totalSongsPlayed = (songsPlayedAgg[0]?.totalSongsPlayed || 0).toString();

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalRooms,
        activeRooms,
        totalSongsPlayed
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all rooms with pagination and filters
 */
exports.getRooms = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    
    const filter = { isActive: true };
    
    // Filter by search query
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex }
      ];
    }
    
    // Filter by tags
    if (req.query.tags) {
      const tags = req.query.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      if (tags.length > 0) {
        filter.tags = { $in: tags };
      }
    }
    
    // Filter private rooms (unless explicitly requested and user is authenticated)
    if (!req.user || !req.query.includePrivate) {
      filter.isPrivate = false;
    }
    
    // Execute query with pagination
    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .populate('host', 'username avatar')
        .populate('participants.user', 'username avatar status')
        .sort({ 'stats.totalListeners': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Room.countDocuments(filter)
    ]);
    
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
 * Get room by ID or invite code
 */
exports.getRoom = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    
    if (!identifier) {
      throw new BadRequestError('Room identifier is required');
    }
    
    const room = await Room.findOne(buildRoomIdentifierQuery(identifier))
      .sort({ isActive: -1, updatedAt: -1, createdAt: -1 })
      .populate('host', 'username avatar status')
      .populate('moderators', 'username avatar')
      .populate('participants.user', 'username avatar status')
      .populate('playback.currentSong', 'title artist album duration coverArt audioUrl source sourceId')
      .populate('queue', 'title artist album duration coverArt audioUrl source sourceId');
    
    if (!room) {
      throw new NotFoundError('Room not found');
    }

    const currentUserId = req.user?._id?.toString();
    const isHost = isUserHost(room, currentUserId);
    const isParticipant = isUserParticipant(room, currentUserId);

    // Auto-reactivate room if host accesses inactive room
    if (isHost && !room.isActive) {
      logger.info(`Host ${req.user.username} accessing inactive room ${room._id}, reactivating...`);
      await reactivateRoom(room);
      logger.info(`Room ${room._id} reactivated by host`);
    }

    // Host can always access their room
    if (isHost) {
      return res.json({
        success: true,
        data: { room }
      });
    }

    // Non-host access rules:
    // - public active room: allow reading so client can join via invite code flow
    // - private room: must already be participant
    const canAccessAsGuest = room.isActive && !room.isPrivate;
    const canAccessAsMember = room.isActive && isParticipant;

    if (!canAccessAsGuest && !canAccessAsMember) {
      throw new NotFoundError('Room not found');
    }
    
    res.json({
      success: true,
      data: { room }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get room history
 */
exports.getRoomHistory = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      throw new BadRequestError('Room ID is required');
    }

    const room = await Room.findOne(buildRoomIdentifierQuery(roomId))
      .sort({ isActive: -1, updatedAt: -1, createdAt: -1 })
      .populate('host', 'username avatar status')
      .populate('participants.user', 'username avatar status');
    if (!room) {
      throw new NotFoundError('Room not found');
    }

    const currentUserId = req.user?._id?.toString();
    const isHost = isUserHost(room, currentUserId);
    const isParticipant = isUserParticipant(room, currentUserId);

    const canAccessAsGuest = room.isActive && !room.isPrivate;
    const canAccessAsMember = room.isActive && isParticipant;

    if (!isHost && !canAccessAsGuest && !canAccessAsMember) {
      throw new NotFoundError('Room not found');
    }

    const history = await RoomHistory.findOne({ room: room._id })
      .sort({ sessionStart: -1 })
      .populate('songsPlayed.song', 'title artist album duration coverArt audioUrl source sourceId');

    return res.json({
      success: true,
      data: { history: history?.songsPlayed || [] }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Join a room
 */
exports.joinRoom = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    
    logger.info(`Join room request: inviteCode="${inviteCode}", user="${req.user.username}"`);
    
    if (!inviteCode || inviteCode.trim().length === 0) {
      logger.warn('Join room: inviteCode is missing');
      throw new BadRequestError('Invite code is required');
    }
    
    // Find room by invite code (regardless of active status)
    let room = await Room.findOne({ inviteCode: inviteCode.trim() })
      .sort({ isActive: -1, updatedAt: -1 });
    
    logger.info(`Room lookup result: found=${!!room}, isActive=${room?.isActive}`);
    
    if (!room) {
      throw new NotFoundError('Mã mời không tồn tại hoặc không hợp lệ');
    }
    
    // Reactivate inactive room automatically
    if (!room.isActive) {
      logger.info(`Room was inactive, reactivating...`);
      await reactivateRoom(room);
    }
    
    // Ensure roomKey is set
    if (!room.roomKey && room.host) {
      room.roomKey = room.host.toString();
      await room.save();
    }
    
    // Check if room is full
    if (room.participants.length >= room.maxParticipants) {
      throw new BadRequestError('Room is full');
    }
    
    // Check if user is already in room
    const isAlreadyInRoom = isUserParticipant(room, req.user._id.toString());
    
    if (isAlreadyInRoom) {
      // Update user status
      await User.findByIdAndUpdate(req.user._id, {
        currentRoom: room._id,
        status: 'listening'
      });

      // Populate and return room
      room = await populateRoom(room._id);

      return res.json({
        success: true,
        message: 'Already in this room',
        data: { room }
      });
    }
    
    // Add user to room
    room.participants.push({ user: req.user._id });
    await room.save();
    
    // Update user's current room
    await User.findByIdAndUpdate(req.user._id, { 
      currentRoom: room._id,
      status: 'listening'
    });
    
    // Populate room for response
    room = await populateRoom(room._id);
    
    logger.info(`${req.user.username} joined room: ${room.name}`);
    
    res.json({
      success: true,
      message: 'Joined room successfully',
      data: { room }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Leave a room
 */
exports.leaveRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    
    if (!roomId) {
      throw new BadRequestError('Room ID is required');
    }
    
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw new NotFoundError('Room not found');
    }

    const userId = req.user._id.toString();
    const isHost = isUserHost(room, userId);

    // Remove participant from room
    room.participants = room.participants.filter(
      p => p.user.toString() !== userId
    );

    await room.save();

    // Update user status
    await User.findByIdAndUpdate(req.user._id, { 
      currentRoom: null,
      status: 'online'
    });

    if (isHost) {
      logger.info(`${req.user.username} left room (as host): ${room.name}, room still active for others`);
    } else {
      logger.info(`${req.user.username} left room: ${room.name}`);
    }
    
    res.json({
      success: true,
      message: 'Left room successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update room settings (host and moderators only)
 */
exports.updateRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { name, description, isPrivate, maxParticipants, tags, settings, isActive } = req.body;
    
    if (!roomId) {
      throw new BadRequestError('Room ID is required');
    }
    
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw new NotFoundError('Room not found');
    }
    
    const userId = req.user._id.toString();
    const isHost = isUserHost(room, userId);
    const isModerator = isUserModerator(room, userId);

    if (!isHost && !isModerator) {
      throw new ForbiddenError('Only host and moderators can update room settings');
    }
    
    // Update allowed fields
    if (name !== undefined && name.trim().length > 0) {
      room.name = name.trim();
    }
    if (description !== undefined) {
      room.description = description;
    }
    if (isPrivate !== undefined) {
      room.isPrivate = Boolean(isPrivate);
    }
    if (maxParticipants !== undefined) {
      const max = parseInt(maxParticipants);
      if (max > 0 && max <= 100) {
        room.maxParticipants = max;
      }
    }
    if (tags !== undefined && Array.isArray(tags)) {
      room.tags = tags.filter(tag => tag && tag.trim().length > 0);
    }
    if (settings && typeof settings === 'object') {
      room.settings = { ...room.settings, ...settings };
    }
    
    // Only host can change active status
    if (isActive !== undefined && isHost) {
      room.isActive = Boolean(isActive);
    }
    
    await room.save();
    
    logger.info(`Room updated: ${room.name} by ${req.user.username}`);
    
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
 * Delete/deactivate room (host only)
 */
exports.deleteRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    
    if (!roomId) {
      throw new BadRequestError('Room ID is required');
    }
    
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw new NotFoundError('Room not found');
    }
    
    const userId = req.user._id.toString();
    if (!isUserHost(room, userId)) {
      throw new ForbiddenError('Only host can delete room');
    }
    
    // Deactivate room instead of deleting
    room.isActive = false;
    await room.save();
    
    // Update all participants' current room
    await User.updateMany(
      { currentRoom: roomId },
      { currentRoom: null, status: 'online' }
    );
    
    logger.info(`Room deleted: ${room.name} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add moderator (host only)
 */
exports.addModerator = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    
    if (!roomId || !userId) {
      throw new BadRequestError('Room ID and User ID are required');
    }
    
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw new NotFoundError('Room not found');
    }
    
    const currentUserId = req.user._id.toString();
    if (!isUserHost(room, currentUserId)) {
      throw new ForbiddenError('Only host can add moderators');
    }
    
    // Check if user is in room
    if (!isUserParticipant(room, userId)) {
      throw new BadRequestError('User is not in this room');
    }
    
    // Add moderator if not already one
    if (!isUserModerator(room, userId)) {
      room.moderators.push(userId);
      await room.save();
      logger.info(`User ${userId} added as moderator to room ${room.name}`);
    }
    
    // Populate and return
    const populatedRoom = await populateRoom(room._id);
    
    res.json({
      success: true,
      message: 'Moderator added successfully',
      data: { room: populatedRoom }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove moderator (host only)
 */
exports.removeModerator = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    
    if (!roomId || !userId) {
      throw new BadRequestError('Room ID and User ID are required');
    }
    
    const room = await Room.findById(roomId);
    
    if (!room) {
      throw new NotFoundError('Room not found');
    }
    
    const currentUserId = req.user._id.toString();
    if (!isUserHost(room, currentUserId)) {
      throw new ForbiddenError('Only host can remove moderators');
    }
    
    // Remove moderator
    room.moderators = room.moderators.filter(m => m.toString() !== userId);
    await room.save();
    
    logger.info(`User ${userId} removed as moderator from room ${room.name}`);
    
    // Populate and return
    const populatedRoom = await populateRoom(room._id);
    
    res.json({
      success: true,
      message: 'Moderator removed successfully',
      data: { room: populatedRoom }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get trending rooms for Explore page (public active rooms with optional filters)
 */
exports.getTrendingRooms = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const filter = {
      isActive: true,
      isPrivate: false,
      participants: { $exists: true, $not: { $size: 0 } }
    };

    if (req.query.playingOnly === 'true') {
      filter['playback.isPlaying'] = true;
    }

    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { tags: searchRegex }
      ];
    }

    const tagQuery = req.query.tags || req.query.tag || req.query.mood;
    if (tagQuery) {
      const tags = tagQuery
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);

      if (tags.length > 0) {
        filter.tags = { $in: tags.map(tag => new RegExp(`^${tag}$`, 'i')) };
      }
    }

    const rooms = await Room.find(filter)
      .populate('host', 'username avatar status')
      .populate('participants.user', 'username avatar status')
      .populate('playback.currentSong', 'title artist album duration coverArt thumbnail source sourceId')
      .sort({ 'playback.isPlaying': -1, 'stats.totalListeners': -1, 'stats.songsPlayed': -1, updatedAt: -1 })
      .limit(limit)
      .lean();

    const normalizedRooms = rooms.map(room => {
      const onlineParticipants = (room.participants || []).filter(
        participant => participant.user?.status && participant.user.status !== 'offline'
      );
      const listenerCount = onlineParticipants.length || room.participants?.length || 0;
      const currentSong = room.playback?.currentSong || null;

      return {
        ...room,
        listenerCount,
        onlineCount: onlineParticipants.length,
        genre: room.tags?.[0] || 'Live Music',
        coverArt: currentSong?.coverArt || currentSong?.thumbnail || null,
        isPlaying: Boolean(room.playback?.isPlaying),
        joinPath: `/room/${room.inviteCode || room._id}`
      };
    });

    res.json({
      success: true,
      data: {
        rooms: normalizedRooms,
        meta: {
          limit,
          total: normalizedRooms.length,
          filters: {
            search: req.query.search || null,
            tags: tagQuery || null,
            playingOnly: req.query.playingOnly === 'true'
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's active hosted room
 */
exports.getMyHostedRoom = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    logger.info(`getMyHostedRoom: user=${userId}`);
    
    const room = await Room.findOne({
      host: req.user._id
    })
      .sort({ isActive: -1, updatedAt: -1, createdAt: -1 })
      .populate('host', 'username avatar status')
      .populate('moderators', 'username avatar')
      .populate('participants.user', 'username avatar status')
      .populate('playback.currentSong', 'title artist album duration coverArt audioUrl source sourceId')
      .populate('queue', 'title artist album duration coverArt audioUrl source sourceId');

    if (room) {
      logger.info(`getMyHostedRoom result: room=${room._id}, roomKey=${room.roomKey}, isActive=${room.isActive}`);
    } else {
      logger.info(`getMyHostedRoom result: no room found`);
    }

    res.json({
      success: true,
      data: { room }
    });
  } catch (error) {
    next(error);
  }
};
