import { User } from "../model/user.model.js"; // Import your User model

// change user's online status
export const lastActiveUpdate = async (request, reply) => {
  const { id } = request.params; // Get user ID from the request params
  const { event } = request.body; // Accept the event type ("open" or "close")

  if (!["open", "close"].includes(event)) {
    return reply
      .status(400)
      .send({ message: 'Invalid event type. Use "open" or "close".' });
  }

  try {
    let lastActiveValue;

    if (event === "open") {
      lastActiveValue = "online";
    } else if (event === "close") {
      lastActiveValue = new Date().toISOString();
    }

    const result = await User.findByIdAndUpdate(
      id,
      { lastActive: lastActiveValue },
      { new: true }
    );

    if (!result) {
      return reply.status(404).send({ message: "User not found" });
    }

    reply.send({
      message: `User last active updated on ${event}`,
      user: result,
    });
  } catch (err) {
    console.error(err);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};

// get all online user
export const getOnlineUsersInGroup = async (request, reply) => {
  const { groupId } = request.params;

  try {
    const onlineUsers = await User.find({
      lastActive: "online",
      groupIDs: groupId,
    });

    if (onlineUsers.length === 0) {
      return reply.status(404).send({ message: "No online users found in this group" });
    }

    reply.send({ onlineUsers });
  } catch (err) {
    console.error(err);
    reply.status(500).send({ error: "Internal Server Error" });
  }
};