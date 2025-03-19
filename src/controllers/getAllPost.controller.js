import { Post } from "../model/post.model.js";
import { User } from "../model/user.model.js";
import mongoose from "mongoose";

export const getPostsByLocation = async (req, reply) => {
  const { lat, long, page = 1, limit = 10, userId } = req.query;

  if (!lat || !long) {
    return reply.status(400).send({
      error: "Latitude and Longitude are required to fetch nearby posts.",
    });
  }


  try {
    const radiusInMeters = 5000;

    const posts = await Post.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(long), parseFloat(lat)],
          },
          distanceField: "distance",
          maxDistance: radiusInMeters,
          spherical: true,
        },
      },
      {
        $match: {
          $or: [{ groupID: { $exists: false } }, { groupID: null }],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "votes",
          let: {
            postId: "$_id",
            userId: userId ? new mongoose.Types.ObjectId(userId) : null,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$postId", "$$postId"] },
                    { $eq: ["$userId", "$$userId"] },
                  ],
                },
              },
            },
            { $project: { _id: 0, type: 1 } },
          ],
          as: "userVote",
        },
      },
      {
        $addFields: {
          userVote: { $arrayElemAt: ["$userVote.type", 0] },
        },
      },
      {
        $project: {
          content: 1,
          images: 1,
          videos: 1,
          audios: 1,
          totalUpvotes: 1,
          totalDownvotes: 1,
          totalVotes: 1,
          totalComment: 1,
          location: 1,
          isAnonymous: 1,
          createdAt: 1,
          trendingPosition: 1,
          timestamps: 1,
          user: { username: 1, profileImage: 1, name: 1 },
          userVote: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: Number(limit) },
    ]);

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

export const getPostsByUserId = async (req, reply) => {
  const { userId, page = 1, limit = 10, anonymous } = req.query;

  if (!userId) {
    return reply.status(400).send({
      error: "User ID is required to fetch posts.",
    });
  }

  // Filter object for isAnonymous condition
  let filter = { userId: new mongoose.Types.ObjectId(userId) };
  if (anonymous !== undefined) {
    filter.isAnonymous = anonymous === "true"; // Convert to boolean
  }

  try {
    const posts = await Post.aggregate([
      {
        $match: filter,
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "votes",
          let: { postId: "$_id", userId: new mongoose.Types.ObjectId(userId) },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$postId", "$$postId"] }, { $eq: ["$userId", "$$userId"] }],
                },
              },
            },
            { $project: { _id: 0, type: 1 } },
          ],
          as: "userVote",
        },
      },
      {
        $addFields: {
          userVote: { $arrayElemAt: ["$userVote.type", 0] },
        },
      },
      {
        $project: {
          content: 1,
          images: 1,
          videos: 1,
          audios: 1,
          totalUpvotes: 1,
          totalDownvotes: 1,
          totalVotes: 1,
          totalComment: 1,
          location: 1,
          isAnonymous: 1,
          createdAt: 1,
          trendingPosition: 1,
          timestamps: 1,
          user: { username: 1, profileImage: 1, name: 1 },
          userVote: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: Number(limit) },
    ]);

    reply.send({
      success: true,
      posts,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    reply.status(500).send({
      error: "Failed to fetch posts",
      details: error.message,
    });
  }
};

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
      .populate({
        path: "userId",
        select: "username profileImage name",
        model: "User",
        options: { lean: true }
      })
      .populate("groupID", "name")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean()
      .transform(docs => {
        return docs.map(doc => {
          const transformed = { ...doc };
          transformed.user = transformed.userId;
          delete transformed.userId;
          return transformed;
        });
      });

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

  if (!lat || !long) {
    return reply.status(400).send({
      error: "lat and long are required to fetch posts near location.",
    });
  }

  try {
    let response = { success: true };

    // If userId is provided, get posts from user's groups
    if (userId) {
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
        .populate({
          path: "userId",
          select: "username profileImage name",
          model: "User",
          options: { lean: true }
        })
        .populate("groupID", "name")
        .sort({ totalUpvotes: -1, createdAt: -1 })
        .limit(10)
        .lean()
        .transform(docs => {
          return docs.map(doc => {
            const transformed = { ...doc };
            transformed.user = transformed.userId;
            delete transformed.userId;
            return transformed;
          });
        });

      response.topGroupPosts = topGroupPosts;
    }

    // Always get top posts near location
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
        { groupID: { $exists: false } },
        { groupID: null }
      ]
    })
      .select("-embedding")
      .populate({
        path: "userId",
        select: "username profileImage name",
        model: "User",
        options: { lean: true }
      })
      .sort({ totalUpvotes: -1, createdAt: -1 })
      .limit(10)
      .lean()
      .transform(docs => {
        return docs.map(doc => {
          const transformed = { ...doc };
          transformed.user = transformed.userId;
          delete transformed.userId;
          return transformed;
        });
      });

    response.topLocationPosts = topLocationPosts;

    reply.send(response);
  } catch (error) {
    console.error("Error fetching top posts:", error);
    reply.status(500).send({
      error: "Failed to fetch posts",
      details: error.message,
    });
  }
};

export const getHotsPosts = async (req, reply) => {
  const { lat, long, maxDistance = 5000, limit = 20 } = req.query;

  if (!lat || !long) {
    return reply.status(400).send({ error: "lat and long are required." });
  }

  try {
    const trendingPosts = await Post.find({
      isTrending: true,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(long), parseFloat(lat)] },
          $maxDistance: Number(maxDistance),
        },
      },
    })
      .select("-embedding")
      .populate({ path: "userId", select: "username profileImage", model: "User", options: { lean: true } })
      .sort({ trendingPosition: 1 })
      .limit(Number(limit))
      .lean();

    const rankedPosts = trendingPosts.map((post, index) => ({ ...post, rank: index + 1 }));
    reply.send({ success: true, hotsPosts: rankedPosts });
  } catch (error) {
    console.error("Error fetching hot posts:", error);
    reply.status(500).send({ error: "Failed to fetch hot posts", details: error.message });
  }
};