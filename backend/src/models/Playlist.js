const mongoose = require('mongoose');

/**
 * Playlist Schema
 * User-created playlists with songs
 */
const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Playlist name is required'],
    trim: true,
    minlength: [1, 'Playlist name must be at least 1 character'],
    maxlength: [50, 'Playlist name cannot exceed 50 characters']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  songs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song'
  }],
  coverArt: {
    type: String,
    default: null
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  playCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  color: {
    type: String,
    default: '#8b5cf6' // Default purple
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for song count
playlistSchema.virtual('songCount').get(function() {
  return this.songs.length;
});

// Virtual for follower count
playlistSchema.virtual('followerCount').get(function() {
  return this.followers.length;
});

// Index for faster queries
playlistSchema.index({ isPublic: 1 });
playlistSchema.index({ name: 'text', description: 'text' });
playlistSchema.index({ playCount: -1 });

module.exports = mongoose.model('Playlist', playlistSchema);
