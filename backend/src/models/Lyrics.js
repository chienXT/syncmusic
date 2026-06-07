const mongoose = require('mongoose');

const lyricLineSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  start: {
    type: Number,
    required: true,
    min: 0,
  },
  duration: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

const lyricsSchema = new mongoose.Schema({
  source: {
    type: String,
    required: true,
    trim: true,
  },
  sourceId: {
    type: String,
    required: true,
    trim: true,
  },
  title: {
    type: String,
    default: '',
    trim: true,
  },
  artist: {
    type: String,
    default: '',
    trim: true,
  },
  lines: {
    type: [lyricLineSchema],
    default: [],
  },
  provider: {
    type: String,
    default: 'youtube_transcript',
  },
  status: {
    type: String,
    enum: ['found', 'empty'],
    default: 'found',
  },
  fetchedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

lyricsSchema.index({ source: 1, sourceId: 1 }, { unique: true });
lyricsSchema.index({ fetchedAt: -1 });

module.exports = mongoose.model('Lyrics', lyricsSchema);