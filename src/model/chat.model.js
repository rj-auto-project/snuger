import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  from: {
    type: String,  // userID from session
    required: true,
    index: true
  },
  to: {
    type: String,  // userID from session
    required: true,
    index: true
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  participants: [{
    type: String,  // userIDs from session store
    required: true
  }],
  messages: [messageSchema],
  lastMessage: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure participants array is always sorted for consistent querying
chatSchema.pre('save', function(next) {
  this.participants.sort();
  next();
});

// Index for efficient chat lookup
chatSchema.index({ participants: 1 });
chatSchema.index({ lastMessage: -1 });

// Methods to handle chat operations
chatSchema.statics.findOrCreateChat = async function(userID1, userID2) {
  const participants = [userID1, userID2].sort();
  
  let chat = await this.findOne({ participants });
  
  if (!chat) {
    chat = await this.create({
      participants,
      messages: []
    });
  }
  
  return chat;
};

// Add message to chat
chatSchema.methods.addMessage = async function(message) {
  this.messages.push(message);
  this.lastMessage = new Date();
  return this.save();
};

// Get recent messages with pagination
chatSchema.methods.getRecentMessages = async function(limit = 50, skip = 0) {
  return this.messages
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(skip, skip + limit);
};

// Mark messages as read
chatSchema.methods.markMessagesAsRead = async function(userID) {
  this.messages.forEach(msg => {
    if (msg.to === userID && !msg.read) {
      msg.read = true;
    }
  });
  return this.save();
};

const Chat = mongoose.model('Chat', chatSchema);

export { Chat };