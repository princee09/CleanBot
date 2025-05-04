const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role: { 
    type: String, 
    enum: ['system', 'user', 'assistant'], 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  }
});

const UserChatSessionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sessionId: { 
    type: String, 
    required: true 
  },
  title: { 
    type: String, 
    default: 'New Chat' 
  },
  conversation: [MessageSchema],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Create a compound index to ensure uniqueness of sessionId per user
UserChatSessionSchema.index({ userId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model('UserChatSession', UserChatSessionSchema);