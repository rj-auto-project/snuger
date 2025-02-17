import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: [val => val.length === 2, 'Need exactly 2 participants']
  }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  unreadCount: { type: Map, of: Number, default: {} }
}, { timestamps: true });

chatSchema.index({ participants: 1, updatedAt: -1 });

export const Chat = mongoose.model('Chat', chatSchema);