import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  participants: [{
    type: String,  // userIDs from session store
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,  // Changed from Date to ObjectId
    ref: 'Messages'                         // Reference to Message model
  },
  lastMessageTime: {                       // Added separate field for last message time
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
chatSchema.index({ lastMessageTime: -1 });

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
  this.messages.push(message._id);
  this.lastMessage = message._id;        // Store message ObjectId
  this.lastMessageTime = new Date();     // Update time separately
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