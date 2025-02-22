import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ["upvote", "downvote", "reach", "comment", "proxy_request"],
    required: true,
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "onModel",
    required: true,
  },
  onModel: {
    type: String,
    required: true,
    enum: ["Post", "ProxyRequest"],
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  additionalCount: {
    type: Number,
    default: 0,
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

notificationSchema.index({ userId: 1, createdAt: -1 });
const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
