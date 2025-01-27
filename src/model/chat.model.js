import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  ],
  messages: [
    {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: ['text', 'image', 'video', 'file'],
        default: 'text',
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      readBy: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },
  ],
  isGroupChat: {
    type: Boolean,
    default: false,
  },
  groupName: {
    type: String,
    required: function () {
      return this.isGroupChat;
    },
  },
  groupAvatar: {
    type: String,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

ChatSchema.pre('save', function (next) {
  this.lastUpdated = new Date();
  next();
});

export const Chat = mongoose.model('Chat', ChatSchema);