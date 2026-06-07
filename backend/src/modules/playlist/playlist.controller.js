const Playlist = require('../../models/Playlist');
const Song = require('../../models/Song');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../../utils/errors');
const logger = require('../../utils/logger');

/**
 * Create a new playlist
 */
exports.createPlaylist = async (req, res, next) => {
  try {
    const { name, description, isPublic, color } = req.body;
    
    const playlist = await Playlist.create({
      name,
      description,
      isPublic: isPublic || false,
      color: color || '#8b5cf6',
      owner: req.user._id
    });
    
    logger.info(`Playlist created: ${name} by ${req.user.username}`);
    
    res.status(201).json({
      success: true,
      message: 'Playlist created successfully',
      data: { playlist }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's playlists
 */
exports.getUserPlaylists = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const targetUserId = !userId || userId === 'me' ? req.user?._id : userId;

    if (!targetUserId) {
      throw new BadRequestError('User ID is required');
    }

    const playlists = await Playlist.find({ owner: targetUserId })
      .populate('songs', 'title artist album duration coverArt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { playlists }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get playlist by ID
 */
exports.getPlaylist = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    
    const playlist = await Playlist.findById(playlistId)
      .populate('owner', 'username avatar')
      .populate('songs', 'title artist album duration coverArt')
      .populate('followers', 'username avatar');
    
    if (!playlist) {
      throw new NotFoundError('Playlist not found');
    }
    
    // Check if user has access
    if (!playlist.isPublic && playlist.owner._id.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('This playlist is private');
    }
    
    res.json({
      success: true,
      data: { playlist }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update playlist
 */
exports.updatePlaylist = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const { name, description, isPublic, coverArt, color, tags } = req.body;
    
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
      throw new NotFoundError('Playlist not found');
    }
    
    if (playlist.owner.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('Only owner can update playlist');
    }
    
    if (name) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (isPublic !== undefined) playlist.isPublic = isPublic;
    if (coverArt !== undefined) playlist.coverArt = coverArt;
    if (color) playlist.color = color;
    if (tags) playlist.tags = tags;
    
    await playlist.save();
    
    res.json({
      success: true,
      message: 'Playlist updated successfully',
      data: { playlist }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete playlist
 */
exports.deletePlaylist = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
      throw new NotFoundError('Playlist not found');
    }
    
    if (playlist.owner.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('Only owner can delete playlist');
    }
    
    await Playlist.findByIdAndDelete(playlistId);
    
    logger.info(`Playlist deleted: ${playlist.name} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'Playlist deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add song to playlist
 */
exports.addSongToPlaylist = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const { songId } = req.body;
    
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
      throw new NotFoundError('Playlist not found');
    }
    
    if (playlist.owner.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('Only owner can add songs to playlist');
    }
    
    const song = await Song.findById(songId);
    
    if (!song) {
      throw new NotFoundError('Song not found');
    }
    
    // Check if song is already in playlist
    if (playlist.songs.includes(songId)) {
      throw new BadRequestError('Song already in playlist');
    }
    
    playlist.songs.push(songId);
    await playlist.save();
    
    res.json({
      success: true,
      message: 'Song added to playlist',
      data: { playlist }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove song from playlist
 */
exports.removeSongFromPlaylist = async (req, res, next) => {
  try {
    const { playlistId, songId } = req.params;
    
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
      throw new NotFoundError('Playlist not found');
    }
    
    if (playlist.owner.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('Only owner can remove songs from playlist');
    }
    
    playlist.songs = playlist.songs.filter(id => id.toString() !== songId);
    await playlist.save();
    
    res.json({
      success: true,
      message: 'Song removed from playlist',
      data: { playlist }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Follow/unfollow playlist
 */
exports.toggleFollowPlaylist = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
      throw new NotFoundError('Playlist not found');
    }
    
    if (!playlist.isPublic) {
      throw new BadRequestError('Cannot follow private playlist');
    }
    
    const isFollowing = playlist.followers.includes(req.user._id);
    
    if (isFollowing) {
      playlist.followers = playlist.followers.filter(id => id.toString() !== req.user._id.toString());
    } else {
      playlist.followers.push(req.user._id);
    }
    
    await playlist.save();
    
    res.json({
      success: true,
      message: isFollowing ? 'Unfollowed playlist' : 'Followed playlist',
      data: { playlist }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get public playlists
 */
exports.getPublicPlaylists = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const playlists = await Playlist.find({ isPublic: true })
      .populate('owner', 'username avatar')
      .populate('songs', 'title artist album duration coverArt')
      .sort({ followerCount: -1, playCount: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Playlist.countDocuments({ isPublic: true });
    
    res.json({
      success: true,
      data: {
        playlists,
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
