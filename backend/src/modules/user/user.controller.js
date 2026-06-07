const User = require('../../models/User');
const { BadRequestError, NotFoundError } = require('../../utils/errors');
const logger = require('../../utils/logger');

/**
 * Get user by ID
 */
exports.getUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('-password -email')
      .populate('currentRoom', 'name inviteCode isActive')
      .populate('friends', 'username avatar status')
      .populate('recentlyPlayed', 'title artist album coverArt');
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search users
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      throw new BadRequestError('Search query is required');
    }
    
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } }
      ]
    })
      .select('username avatar status')
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
 * Send friend request
 */
exports.sendFriendRequest = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user._id.toString()) {
      throw new BadRequestError('Cannot send friend request to yourself');
    }
    
    const targetUser = await User.findById(userId);
    
    if (!targetUser) {
      throw new NotFoundError('User not found');
    }
    
    const currentUser = await User.findById(req.user._id);
    
    // Check if already friends
    if (currentUser.friends.includes(userId)) {
      throw new BadRequestError('Already friends');
    }
    
    // Check if request already sent
    if (targetUser.friendRequests.includes(req.user._id)) {
      throw new BadRequestError('Friend request already sent');
    }
    
    targetUser.friendRequests.push(req.user._id);
    await targetUser.save();
    
    logger.info(`Friend request sent from ${req.user.username} to ${targetUser.username}`);
    
    res.json({
      success: true,
      message: 'Friend request sent'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept friend request
 */
exports.acceptFriendRequest = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const currentUser = await User.findById(req.user._id);
    
    if (!currentUser.friendRequests.includes(userId)) {
      throw new BadRequestError('No friend request from this user');
    }
    
    const otherUser = await User.findById(userId);
    
    // Add to friends list for both users
    currentUser.friends.push(userId);
    otherUser.friends.push(req.user._id);
    
    // Remove from friend requests
    currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== userId);
    
    await currentUser.save();
    await otherUser.save();
    
    logger.info(`Friend request accepted between ${req.user.username} and ${otherUser.username}`);
    
    res.json({
      success: true,
      message: 'Friend request accepted'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Decline friend request
 */
exports.declineFriendRequest = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const currentUser = await User.findById(req.user._id);
    
    if (!currentUser.friendRequests.includes(userId)) {
      throw new BadRequestError('No friend request from this user');
    }
    
    currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== userId);
    await currentUser.save();
    
    res.json({
      success: true,
      message: 'Friend request declined'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove friend
 */
exports.removeFriend = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const currentUser = await User.findById(req.user._id);
    const otherUser = await User.findById(userId);
    
    if (!currentUser.friends.includes(userId)) {
      throw new BadRequestError('Not friends with this user');
    }
    
    currentUser.friends = currentUser.friends.filter(id => id.toString() !== userId);
    otherUser.friends = otherUser.friends.filter(id => id.toString() !== req.user._id.toString());
    
    await currentUser.save();
    await otherUser.save();
    
    res.json({
      success: true,
      message: 'Friend removed'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get friend requests
 */
exports.getFriendRequests = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friendRequests', 'username avatar status');
    
    res.json({
      success: true,
      data: { friendRequests: user.friendRequests }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user status
 */
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    const user = await User.findById(req.user._id);
    user.status = status;
    await user.save();
    
    res.json({
      success: true,
      message: 'Status updated',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add to recently played
 */
exports.addToRecentlyPlayed = async (req, res, next) => {
  try {
    const { songId } = req.body;

    if (!songId) {
      throw new BadRequestError('Song ID is required');
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.recentlyPlayed = (user.recentlyPlayed || []).filter(
      (id) => id && id.toString() !== songId.toString()
    );

    user.recentlyPlayed.unshift(songId);

    if (user.recentlyPlayed.length > 50) {
      user.recentlyPlayed = user.recentlyPlayed.slice(0, 50);
    }

    await user.save();
    await user.populate('recentlyPlayed', 'title artist album duration coverArt');

    res.json({
      success: true,
      data: {
        recentlyPlayed: (user.recentlyPlayed || []).filter(Boolean)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recently played
 */
exports.getRecentlyPlayed = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('recentlyPlayed', 'title artist album duration coverArt');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      data: {
        recentlyPlayed: (user.recentlyPlayed || []).filter(Boolean)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user preferences
 */
exports.getPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('preferences');
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    res.json({
      success: true,
      data: { preferences: user.preferences }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user preferences
 */
exports.updatePreferences = async (req, res, next) => {
  try {
    const { theme, notifications, autoPlay } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    if (theme) user.preferences.theme = theme;
    if (notifications !== undefined) user.preferences.notifications = notifications;
    if (autoPlay !== undefined) user.preferences.autoPlay = autoPlay;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Preferences updated',
      data: { preferences: user.preferences }
    });
  } catch (error) {
    next(error);
  }
};
