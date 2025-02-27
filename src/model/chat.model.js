import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  readBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: [val => val.length === 2, 'Need exactly 2 participants']
  }],
  messages: [messageSchema],
  lastMessage: {
    content: String,
    time: Date,
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  unreadCount: { type: Map, of: Number, default: {} }
}, { timestamps: true });


chatSchema.index({ participants: 1, updatedAt: -1 });
chatSchema.index({ 'messages.from': 1, 'messages.time': -1 });
chatSchema.index({ 'messages.to': 1, 'messages.time': -1 });

export const Chat = mongoose.model('Chat', chatSchema);