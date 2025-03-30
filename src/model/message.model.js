import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', index: true },
  content: String,
  type: { type: String, enum: ['text', 'image'], default: 'text' },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' }
}, { timestamps: true });

messageSchema.index({ chat: 1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);