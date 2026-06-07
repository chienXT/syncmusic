const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const passport = require('passport');
require('../config/passport');
const logger = require('../utils/logger');
const authRoutes = require('../modules/auth/auth.routes');
const roomRoutes = require('../modules/room/room.routes');
const songRoutes = require('../modules/player/song.routes');
const playlistRoutes = require('../modules/playlist/playlist.routes');
const userRoutes = require('../modules/user/user.routes');
const messageRoutes = require('../modules/chat/chat.routes');
const lyricsRoutes = require('../modules/lyrics/lyrics.routes');
const adminRoutes = require('../modules/admin/admin.routes');

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000,http://192.168.1.218:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    callback(new Error(`CORS policy does not allow access from origin ${origin}`));
  },
  credentials: true
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};

const errorHandler = (err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

const initializeExpress = (app) => {
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  app.use(cors(corsOptions));
  app.use(session({
    secret: process.env.JWT_SECRET || 'syncmusic_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/songs', songRoutes);
  app.use('/api/playlists', playlistRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/lyrics', lyricsRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('/', (req, res) => {
    res.json({
      message: 'SyncMusic API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        rooms: '/api/rooms',
        songs: '/api/songs',
        playlists: '/api/playlists',
        users: '/api/users',
        messages: '/api/messages'
      }
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
};

module.exports = { initializeExpress };
