import { Post } from "../model/post.model.js";
import { User } from "../model/user.model.js";
import mongoose from "mongoose";

export const getPostsByLocation = async (req, reply) => {
  const { lat, long, page = 1, limit = 10 } = req.query;

  if (!lat || !long) {
    return reply.status(400).send({
      error: "Latitude and Longitude are required to fetch nearby snugs.",
    });
  }

  try {
    const radiusInMeters = 5000;
    const posts = await Post.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(long), parseFloat(lat)],
          },
          $maxDistance: radiusInMeters,
        },
      },
      $or: [
        { groupID: { $exists: false } }, // groupID field doesn't exist
        { groupID: null }, // groupID is null
      ],
    })
      .select("-embedding")
      .populate("userId", "username profileImage")
      .populate("groupID", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    reply.send({
      success: true,
      posts,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    reply.status(500).send({
      error: "Failed to fetch posts",
      details: error.message,
    });
  }
};

// get post by group
export const getGroupPosts = async (req, reply) => {
  const { groupID, lastSeenSnugId, limit = 10 } = req.query;

  if (!groupID) {
    return reply.status(400).send({
      error: "groupID is required to fetch snugs for a specific group.",
    });
  }

  try {
    const query = { groupID };

    if (lastSeenSnugId) {
      const lastSnug = await Post.findById(lastSeenSnugId);
      if (!lastSnug) {
        return reply.status(400).send({
          error: "Invalid lastSeenSnugId. Snug not found.",
        });
      }

      query._id = { $lt: lastSeenSnugId };
    }

    const posts = await Post.find(query)
      .select("-embedding")
      .populate("userId", "username profileImage")
      .populate("groupID", "name")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    reply.send({
      success: true,
      posts,
      groupID,
      limit: Number(limit),
    });
  } catch (error) {
    reply.status(500).send({
      error: "Failed to fetch posts",
      details: error.message,
    });
  }
};

export const getTopPosts = async (req, reply) => {
  const { userId, lat, long, radius = 5000 } = req.query;

  if (!userId) {
    return reply.status(400).send({
      error:
        "userId is required to fetch posts for user's groups and location.",
    });
  }

  if (!lat || !long) {
    return reply.status(400).send({
      error: "lat and long are required to fetch posts near user's location.",
    });
  }

  try {
    // Fetch user's groups
    const user = await User.findById(userId).lean();
    if (!user) {
      return reply.status(404).send({ error: "User not found." });
    }

    const groupIDs = user.groupIDs || [];

    // Get top 10 upvoted posts from user's groups
    const topGroupPosts = await Post.find({
      groupID: {
        $in: groupIDs
          .map((id) => (mongoose.Types.ObjectId.isValid(id) ? id : null))
          .filter((id) => id !== null),
      },
    })
      .select("-embedding")
      .sort({ totalUpvotes: -1, createdAt: -1 }) // Sort by total upvotes and then by date
      .limit(10)
      .populate("userId", "username profileImage")
      .populate("groupID", "name")
      .lean();

    // Get top 10 upvoted posts near user's location
    const topLocationPosts = await Post.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(long), parseFloat(lat)],
          },
          $maxDistance: Number(radius),
        },
      },
      $or: [
        { groupID: { $exists: false } }, // groupID field doesn't exist
        { groupID: null }, // groupID is null
      ],
    })
      .select("-embedding")
      .sort({ totalUpvotes: -1, createdAt: -1 }) // Sort by total upvotes and then by date
      .limit(10)
      .populate("userId", "username profileImage")
      .populate("groupID", "name")
      .lean();

    reply.send({
      success: true,
      topGroupPosts,
      topLocationPosts,
    });
  } catch (error) {
    console.error("Error fetching top posts:", error);
    reply.status(500).send({
      error: "Failed to fetch posts",
      details: error.message,
    });
  }
};


// updated