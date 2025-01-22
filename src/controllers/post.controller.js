import mongoose from "mongoose";
import { Post } from "../model/post.model.js";
import { Storage } from "@google-cloud/storage";
import { credentials } from "../../credentials.js";
import { getEmbedding } from "../service/getEmbedding.service.js";
import { User } from "../model/user.model.js";

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: credentials,
});
const bucketName = "snuger";

// create post
export const createPost = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const parts = req.parts();
    let userId, content, isAnonymous, locations, groupID;
    let imageURLs = [], videoURLs = [], audioURLs = [];

    for await (const part of parts) {
      if (part.file) {
        const fileBuffer = await part.toBuffer();
        const fileName = part.filename;
        const fileType = part.mimetype.split("/")[0];
        const options = { destination: fileName, gzip: true };

        try {
          const bucket = storage.bucket(bucketName);
          const file = bucket.file(fileName);
          await file.save(fileBuffer, options);
        } catch (error) {
          return reply.status(500).send({
            error: "Media file upload failed",
            details: error.message,
          });
        }

        const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        if (fileType === "image") {
          imageURLs.push(publicUrl);
        } else if (fileType === "video") {
          videoURLs.push(publicUrl);
        } else if (fileType === "audio") {
          audioURLs.push(publicUrl);
        }
      } else {
        switch (part.fieldname) {
          case "userId":
            userId = part.value;
            break;
          case "isAnonymous":
            isAnonymous = part.value;
            break;
          case "location":
            locations = part.value;
            break;
          case "content":
            content = part.value;
            break;
          case "groupID":
            groupID = part.value;
        }
      }
    }
    const parsedLocation = locations ? JSON.parse(locations) : undefined;
    const embedding = await getEmbedding(content)
    // console.log()
    const post = new Post({
      userId,
      content,
      isAnonymous,
      location:parsedLocation
      ? { type: "Point", coordinates: parsedLocation }
      : undefined,
      images: imageURLs,
      videos: videoURLs,
      audios: audioURLs,
      embedding:embedding,
      groupID:groupID
    });
    await post.save({ session });
    await session.commitTransaction();
    session.endSession();

    reply.status(200).send({
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    reply.status(500).send({
      error: "Error creating post",
      details: error.message,
    });
  }
};

// delete post
export const deletePost = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { postId } = req.params;

    if (!postId) {
      return reply.status(400).send({ error: "postId is required" });
    }

    const post = await Post.findById(postId).session(session);

    if (!post) {
      return reply.status(404).send({ error: "Post not found" });
    }

    await Post.deleteOne({ _id: postId }).session(session);

    await session.commitTransaction();
    session.endSession();

    reply.send({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    reply.status(500).send({
      error: "Failed to delete post",
      details: error.message,
    });
  }
};


// get post by location
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
            coordinates: [long, lat],
          },
          $maxDistance: radiusInMeters,
        },
      },
    })
      .populate("userId", "username profileImage")
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
      .populate("userId", "username profileImage")
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

// get top posts in user's group and user's location
export const getTopPosts = async (req, reply) => {
  const { userId, lat, long, radius = 5000 } = req.query;

  if (!userId) {
    return reply.status(400).send({
      error: "userId is required to fetch posts for user's groups and location.",
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

    const groupIDs = user.groupIDs;

    // Get top 10 upvoted posts from user's groups
    const topGroupPosts = await Post.find({ groupID: { $in: groupIDs } })
      .sort({ upvotes: -1 })
      .limit(10)
      .populate("userId", "username profileImage")
      .lean();

    
    const userLocation = {
      type: "Point",
      coordinates: [long, lat],
    };

    // Get top 10 upvoted posts near user's location
    const topLocationPosts = await Post.find({
      location: {
        $near: {
          $geometry: userLocation,
          $maxDistance: Number(radius),
        },
      },
    })
      .sort({ upvotes: -1 })
      .limit(10)
      .populate("userId", "username profileImage")
      .lean();

    reply.send({
      success: true,
      topGroupPosts,
      topLocationPosts,
    });
  } catch (error) {
    reply.status(500).send({
      error: "Failed to fetch posts",
      details: error.message,
    });
  }
};