import { messaging } from "../config/firebase.js";
import Notification from "../model/notification.model.js";
import { User } from "../model/user.model.js";

export async function formatNotification(notification, actor) {
  const templates = {
    upvote: {
      title: "New Like",
      body: `${actor.username} liked your post`,
    },
    comment: {
      title: "New Comment",
      body: `${actor.username} commented on your post`,
    },
  };

  return templates[notification.type];
}

export async function sendPushNotification(notification) {
  try {
    const user = await User.findById(notification.userId);
    const actor = await User.findById(notification.actorId);

    console.log("user to sent ", user);

    if (!user?.fcmToken) return;

    const notificationData = await formatNotification(notification, actor);

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
      android: {
        priority: "high",
        notification: {
          channelId: "default",
          clickAction: "REACT_NATIVE_ClICK_ACTION",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    await messaging.send(message);
  } catch (error) {
    console.error("Error sending push notification:", error);
    // Log to monitoring service but don't throw
  }
}

export async function createNotification({
  userId,
  type,
  sourceId,
  onModel,
  actorId,
}) {
  try {
    const existingNotification = await Notification.findOneAndUpdate(
      { userId, type, sourceId, onModel, actorId },
      { $set: { updatedAt: new Date() } },
      { new: true }
    );
    if (existingNotification) {
      console.log(
        "Notification already exists, sending push notification only"
      );
      await sendPushNotification(existingNotification);
      return existingNotification;
    }

    const notification = await Notification.create({
      userId,
      type,
      sourceId,
      onModel,
      actorId,
    });
    console.log("Creating notification:", notification);
    await sendPushNotification(notification);
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

export const markAsRead = async (req, reply) => {
  try {
    const { notificationId, userId } = req.body;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true },
      { new: true }
    );

    reply.send(notification);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    reply.code(500).send({ error: "Internal Server Error" });
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
      .populate("actorId", "username avatar");

    reply.send(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    reply.code(500).send({ error: "Internal Server Error" });
  }
};
