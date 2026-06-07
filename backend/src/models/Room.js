const mongoose = require('mongoose');

/**
 * Room Schema
 * Represents a music listening room with synchronized playback
 */
const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    minlength: [3, 'Room name must be at least 3 characters'],
    maxlength: [50, 'Room name cannot exceed 50 characters']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    default: ''
  },
  inviteCode: {
    type: String,
    unique: true,
    index: true
  },
  roomKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  maxParticipants: {
    type: Number,
    default: 50,
    min: [2, 'Minimum 2 participants'],
    max: [100, 'Maximum 100 participants']
  },
  
  // Playback state (authoritative state maintained by server)
  playback: {
    isPlaying: {
      type: Boolean,
      default: false
    },
    currentSong: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song',
      default: null
    },
    currentTime: {
      type: Number,
      default: 0
    },
    lastUpdateTime: {
      type: Date,
      default: Date.now
    },
    volume: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    }
  },
  
  queue: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song'
  }],
  
  settings: {
    allowSkip: {
      type: Boolean,
      default: true
    },
    voteSkipThreshold: {
      type: Number,
      default: 0.5,
      min: 0.1,
      max: 1
    },
    allowQueue: {
      type: Boolean,
      default: true
    },
    autoPlay: {
      type: Boolean,
      default: true
    }
  },
  
  // Vote skip tracking
  skipVotes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Room statistics
  stats: {
    totalListeners: {
      type: Number,
      default: 0
    },
    songsPlayed: {
      type: Number,
      default: 0
    },
    totalListenTime: {
      type: Number,
      default: 0
    }
  },
  
  tags: [{
    type: String,
    trim: true
  }],
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for participant count
roomSchema.virtual('participantCount').get(function() {
  return Array.isArray(this.participants) ? this.participants.length : 0;
});

// Virtual for current participant count (online only)
roomSchema.virtual('onlineParticipantCount').get(function() {
  return Array.isArray(this.participants)
    ? this.participants.filter(p => p?.user?.isOnline).length
    : 0;
});

// Generate unique invite code before saving
roomSchema.pre('save', async function(next) {
  if ((!this.roomKey || !String(this.roomKey).trim()) && this.host) {
    this.roomKey = this.host.toString();
  }

  if (this.isNew && !this.inviteCode) {
    this.inviteCode = await generateInviteCode();
  }
  next();
});

// Helper function to generate invite code
async function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const existing = await mongoose.model('Room').findOne({ inviteCode: code });
    if (!existing) {
      isUnique = true;
    }
  }
  
  return code;
}

// Index for faster queries
roomSchema.index({ host: 1 });
roomSchema.index({ 'participants.user': 1 });
roomSchema.index({ isActive: 1 });
roomSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Room', roomSchema);
