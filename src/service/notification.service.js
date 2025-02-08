import { messaging } from "../config/firebase.js";
import Notification from "../model/notification.model.js";
import { User } from "../model/user.model.js";

export async function sendPushNotification(notification) {
  try {
    const user = await User.findById(notification.userId);
    const actor = await User.findById(notification.actorId);

    if (!user?.fcmToken) return;

    const notificationData = await this.formatNotification(notification, actor);

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
    const notification = await Notification.create({
      userId,
      type,
      sourceId,
      onModel,
      actorId,
    });

    await sendPushNotification(notification);
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

export async function formatNotification(notification, actor) {
  const templates = {
    LIKE: {
      title: "New Like",
      body: `${actor.username} liked your post`,
    },
    COMMENT: {
      title: "New Comment",
      body: `${actor.username} commented on your post`,
    },
  };

  return templates[notification.type];
}

export async function markAsRead(notificationId, userId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );
}

export async function getUserNotifications(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  return Notification.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("actorId", "username avatar")
    .populate("sourceId");
}
