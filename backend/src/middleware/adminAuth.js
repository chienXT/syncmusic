const { ForbiddenError } = require('../utils/errors');

/**
 * Admin authorization middleware
 */
exports.adminAuth = (req, res, next) => {
  if (!req.user) {
    throw new ForbiddenError('Authentication required');
  }

  if (req.user.role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }

  next();
};

/**
 * Moderator or Admin authorization middleware
 */
exports.moderatorAuth = (req, res, next) => {
  if (!req.user) {
    throw new ForbiddenError('Authentication required');
  }

  if (!['moderator', 'admin'].includes(req.user.role)) {
    throw new ForbiddenError('Moderator access required');
  }

  next();
};
