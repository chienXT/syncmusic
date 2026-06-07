const crypto = require('crypto');
const User = require('../../models/User');
const { generateToken } = require('../../utils/jwt');
const { BadRequestError, ConflictError, UnauthorizedError } = require('../../utils/errors');
const logger = require('../../utils/logger');

/**
 * Register new user
 */
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictError('Email already registered');
      }
      throw new ConflictError('Username already taken');
    }
    
    // Create user
    const user = await User.create({
      username,
      email,
      password,
      isOnline: true
    });
    
    // Generate token
    const token = generateToken({ userId: user._id, sessionVersion: user.sessionVersion || 0 });
    
    logger.info(`New user registered: ${user.username}`);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          _id: user._id,
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          status: user.status,
          role: user.role,
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
exports.login = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    
    // Find user by username or email
    const identifier = String(username || email || '').trim();
    if (!identifier) {
      throw new BadRequestError('Username or email is required');
    }

    const normalizedEmail = email ? identifier.toLowerCase() : null;

    // Find user and include password for comparison.
    // Username is matched case-insensitively so users are not blocked by casing.
    const searchQuery = username
      ? { username: new RegExp(`^${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      : { email: normalizedEmail };

    const user = await User.findOne(searchQuery).select('+password');
    
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }
    
    // Update online status and invalidate older sessions
    user.isOnline = true;
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save();
    
    // Generate token
    const token = generateToken({ userId: user._id, sessionVersion: user.sessionVersion });
    
    logger.info(`User logged in: ${user.username}`);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          status: user.status,
          role: user.role,
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new BadRequestError('Email is required');
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.json({
        success: true,
        message: 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được tạo.',
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    logger.info(`Password reset requested for user: ${user.username}`);

    res.json({
      success: true,
      message: 'Yêu cầu đặt lại mật khẩu thành công.',
      data: {
        resetUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      throw new BadRequestError('Token is required');
    }

    if (!password || password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters');
    }

    const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    }).select('+password +resetPasswordToken +resetPasswordExpires');

    if (!user) {
      throw new BadRequestError('Token không hợp lệ hoặc đã hết hạn');
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    logger.info(`Password reset completed for user: ${user.username}`);

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập lại.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Google OAuth callback
 */
exports.googleCallback = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Update online status and invalidate older sessions
    user.isOnline = true;
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save();
    
    // Generate token
    const token = generateToken({ userId: user._id, sessionVersion: user.sessionVersion });
    
    logger.info(`User logged in via Google: ${user.username}`);
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/callback?token=${token}`);
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'username avatar status')
      .populate('currentRoom', 'name inviteCode');
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
exports.logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.isOnline = false;
    user.lastSeen = new Date();
    await user.save();
    
    logger.info(`User logged out: ${user.username}`);
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { username, bio, avatar } = req.body;
    const user = await User.findById(req.user._id);
    
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        throw new ConflictError('Username already taken');
      }
      user.username = username;
    }
    
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};
