const mongoose = require('mongoose');

/**
 * Song Schema
 * Stores song metadata and audio information
 */
const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Song title is required'],
    trim: true
  },
  artist: {
    type: String,
    required: [true, 'Artist is required'],
    trim: true
  },
  album: {
    type: String,
    trim: true,
    default: ''
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: 0
  },
  coverArt: {
    type: String,
    default: null
  },
  audioUrl: {
    type: String,
    required: [true, 'Audio URL is required']
  },
  source: {
    type: String,
    enum: ['youtube', 'spotify', 'soundcloud', 'upload', 'external'],
    default: 'external'
  },
  sourceId: {
    type: String,
    default: null
  },
  genre: [{
    type: String,
    trim: true
  }],
  year: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Statistics
  playCount: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  skipCount: {
    type: Number,
    default: 0
  },
  
  // Trending score for recommendations
  trendingScore: {
    type: Number,
    default: 0
  },
  
  isExplicit: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted duration
songSchema.virtual('formattedDuration').get(function() {
  const minutes = Math.floor(this.duration / 60);
  const seconds = Math.floor(this.duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Update trending score before saving
songSchema.pre('save', function(next) {
  // Calculate trending score based on recent plays
  const daysSinceAdded = Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
  const recencyFactor = Math.max(0, 1 - (daysSinceAdded / 30)); // Decay over 30 days
  this.trendingScore = this.playCount * recencyFactor;
  next();
});

// Index for faster searches
songSchema.index({ title: 'text', artist: 'text', album: 'text' });
songSchema.index({ artist: 1 });
songSchema.index({ genre: 1 });
songSchema.index({ trendingScore: -1 });
songSchema.index({ playCount: -1 });
songSchema.index({ likeCount: -1 });

module.exports = mongoose.model('Song', songSchema);
