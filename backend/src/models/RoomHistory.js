const mongoose = require('mongoose');

/**
 * RoomHistory Schema
 * Tracks historical data about rooms for analytics
 */
const roomHistorySchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  peakParticipants: {
    type: Number,
    default: 0
  },
  songsPlayed: [{
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song'
    },
    playedAt: {
      type: Date,
      default: Date.now
    },
    duration: Number
  }],
  totalListenTime: {
    type: Number,
    default: 0
  },
  sessionStart: {
    type: Date,
    default: Date.now
  },
  sessionEnd: {
    type: Date,
    default: null
  },
  avgSessionDuration: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
roomHistorySchema.index({ room: 1, sessionStart: -1 });
roomHistorySchema.index({ sessionStart: -1 });

module.exports = mongoose.model('RoomHistory', roomHistorySchema);
