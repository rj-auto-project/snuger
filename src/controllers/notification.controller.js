import mongoose from "mongoose";
import { messaging } from "../config/firebase.js";
import Notification from "../model/notification.model.js";
import { User } from "../model/user.model.js";

function formatNotification(notification, actor) {
  const templates = {
    upvote: () => ({
      title: "New Votes",
      body: notification.additionalCount > 0
      ? `${actor.username} and ${notification.additionalCount} others upvote on your Snug`
      : `${actor.username} upvote on your Snug`
    }),
    comment: () => ({
      title: "New Discussion",
      body: notification.additionalCount > 0
        ? `${actor.username} and ${notification.additionalCount} others are discussing on your Snug`
        : `${actor.username} is discussing on your Snug`,
    }),
    proxy_request: () => ({
      title: "Proxy Request",
      body: `${actor.username} is asking to create a proxy`,
    }),
  };

  return templates[notification.type]();
}

// Notification Service
export async function sendPushNotification(notification) {
  try {
    const user = await User.findById(notification.userId);
    const actor = await User.findById(notification.actorId);

    if (!user?.fcmToken) return;

    const notificationData = formatNotification(notification, actor);
    
    const message = {
      token: user.fcmToken,
      notification: {
        title: notificationData.title,
        body: notificationData.body,
      },
      data: {
        type: notification.type,
        sourceId: notification.sourceId.toString(),
        notificationId: notification._id.toString(),
      },
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    };

    await messaging.send(message);
  } catch (error) {
    console.error("Push notification error:", error);
  }
}

export async function createNotification({
  userId,
  type,
  sourceId,
  onModel,
  actorId,
}) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    
    const existing = await Notification.findOneAndUpdate(
      { userId, type, sourceId, onModel },
      { $inc: { additionalCount: 1 }, $set: { updatedAt: new Date() } },
      { new: true, session }
    );

    if (existing) {
      await sendPushNotification(existing);
      await session.commitTransaction();
      return existing;
    }

    const newNotification = await Notification.create([{
      userId,
      type,
      sourceId,
      onModel,
      actorId,
      additionalCount: 0,
    }], { session });

    await sendPushNotification(newNotification[0]);
    await session.commitTransaction();
    return newNotification[0];
  } catch (error) {
    await session.abortTransaction();
    console.error("Notification creation failed:", error);
    throw error;
  } finally {
    session.endSession();
  }
}

// Controller Methods
export const markAsRead = async (req, reply) => {
  try {
    const { notificationId, userId } = req.body;
    
    const updated = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { read: true } },
      { new: true }
    ).populate("actorId", "username avatar");

    reply.send({
      ...updated.toObject(),
      actions: updated.type === 'proxy_request' ? ['Create', 'Decline'] : [],
      message: formatNotification(updated, updated.actorId)
    });
  } catch (error) {
    reply.code(500).send({ error: "Update failed" });
  }
};

export const getUserNotifications = async (req, reply) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("actorId", "username profileImage")
      .lean();

    const formatted = notifications.map(n => ({
      ...n,
      actions: n.type === 'proxy_request' ? ['Create', 'Decline'] : [],
      message: formatNotification(n, n.actorId),
      timestamp: new Date(n.createdAt).toISOString(),
    }));

    reply.send(formatted);
  } catch (error) {
    reply.code(500).send({ error: "Fetch failed" });
  }
};

export default Notification;