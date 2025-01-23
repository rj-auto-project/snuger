// const mongoose = require('mongoose');
import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to User model
      required: true,
    },
  ],
  messages: [
    {
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Reference to User model
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: ["text", "image", "video", "file"], // Message types
        default: "text",
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      readBy: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", // Users who have read this message
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
    type: String, // URL of the group avatar (optional)
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

ChatSchema.pre("save", function (next) {
  this.lastUpdated = new Date(); // Update lastUpdated whenever the chat is saved
  next();
});

const Chat = mongoose.model("Chat", ChatSchema);

module.exports = Chat;
