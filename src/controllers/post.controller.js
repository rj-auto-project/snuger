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

export const createPost = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const parts = req.parts();
    let userId, content, isAnonymous, locations, groupID, pollData;
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
        const value = part.value;
        switch (part.fieldname) {
          case "userId":
            userId = value;
            break;
          case "isAnonymous":
            isAnonymous = value === 'true';
            break;
          case "location":
            locations = value;
            break;
          case "content":
            content = value;
            break;
          case "groupID":
            groupID = value || null;
            break;
          case "poll":
            try {
              pollData = JSON.parse(value);
            } catch (e) {
              console.error("Error parsing poll data:", e);
            }
            break;
        }
      }
    }

    // Validate required userId
    if (!userId) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "userId is required"
      });
    }

    // Process location data
    const parsedLocation = locations ? JSON.parse(locations) : {
      type: "Point",
      coordinates: [87.2620756305604, 24.285815044316077]
    };

    // Process poll data if provided
    let poll = null;
    if (pollData) {
      poll = {
        question: pollData.question,
        options: pollData.options.map(opt => ({
          text: opt,
          votes: [],
          voteCount: 0
        })),
        expiresAt: new Date(Date.now() + (pollData.durationInDays || 7) * 24 * 60 * 60 * 1000),
        totalVotes: 0,
        isActive: true,
        allowMultipleVotes: pollData.allowMultipleVotes || false
      };
    }

    const embedding = content ? await getEmbedding(content) : [];

    // Create post object
    const postData = {
      userId,
      content,
      isAnonymous: isAnonymous || false,
      location: parsedLocation,
      images: imageURLs,
      videos: videoURLs,
      audios: audioURLs,
      embedding,
      groupID: groupID || null
    };

    // Add poll if exists
    if (poll) {
      postData.poll = poll;
    }

    const post = new Post(postData);
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
  const userId = req.user._id;

  try {
    const { postId } = req.params;

    if (!postId) {
      return reply.status(400).send({ error: "postId is required" });
    }

    const post = await Post.findById(postId).session(session);

    if (!post) {
      return reply.status(404).send({ error: "Post not found" });
    }

    // Check if the user is the owner of the post
    if (post.userId.toString() !== userId.toString()) {
      return reply.status(403).send({ 
        error: "Unauthorized", 
        message: "You can only delete your own posts" 
      });
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

// get post details
export const getPost = async (req, reply) => {  
  try {
    const postId = req.params.postId;
    console.log(`Fetching post with ID: ${postId}`);
    const post = await Post.findById(postId)
      .populate({
        path: 'userId',
        select: 'username profilePicture email'
      })
      .lean();

    console.log('Found post:', post); // Debug log

    if (!post) {
      return reply.status(404).send({ 
        error: "Post not found"
      });
    }
    reply.send({ success: true, message: "Post fetched successfully" });
  }    
  catch (error) {
    console.log('Error fetching post:', error); 
  }
};

// Add this helper function to find and remove previous vote
const removeUserPreviousVote = (poll, userId) => {
  for (const option of poll.options) {
    const voteIndex = option.votes.indexOf(userId);
    if (voteIndex !== -1) {
      option.votes.splice(voteIndex, 1);
      option.voteCount -= 1;
      poll.totalVotes -= 1;
      return true;
    }
  }
  return false;
};

export const votePoll = async (req, reply) => {
  try {
    const { postId, optionId } = req.params;
    const { userId } = req.body;

    if (!postId || !optionId || !userId) {
      return reply.status(400).send({
        success: false,
        message: "postId, optionId, and userId are required"
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return reply.status(404).send({
        success: false,
        message: "Post not found"
      });
    }

    if (!post.poll) {
      return reply.status(400).send({
        success: false,
        message: "This post does not have a poll"
      });
    }

    if (!post.poll.isActive) {
      return reply.status(400).send({
        success: false,
        message: "This poll is no longer active"
      });
    }

    if (post.poll.expiresAt < new Date()) {
      post.poll.isActive = false;
      await post.save();
      return reply.status(400).send({
        success: false,
        message: "This poll has expired"
      });
    }

    // Find the option to vote for
    const option = post.poll.options.id(optionId);
    if (!option) {
      return reply.status(404).send({
        success: false,
        message: "Poll option not found"
      });
    }

    // Check if user already voted for this option
    if (option.votes.includes(userId)) {
      return reply.status(400).send({
        success: false,
        message: "You have already voted for this option"
      });
    }

    // If multiple votes aren't allowed, remove previous vote if exists
    if (!post.poll.allowMultipleVotes) {
      const hadPreviousVote = removeUserPreviousVote(post.poll, userId);
      // if (hadPreviousVote) {
      //   console.log(`Removed previous vote from user ${userId}`);
      // }
    }

    // Add new vote
    option.votes.push(userId);
    option.voteCount += 1;
    post.poll.totalVotes += 1;

    await post.save();

    return reply.status(200).send({
      success: true,
      message: "Vote recorded successfully",
      timestamp: "2025-02-09 16:50:33",
      queriedBy: "Ayan-1315",
      poll: {
        question: post.poll.question,
        options: post.poll.options.map(opt => ({
          _id: opt._id,
          text: opt.text,
          voteCount: opt.voteCount,
          percentage: (opt.voteCount / post.poll.totalVotes * 100).toFixed(2) + '%',
          hasUserVoted: opt.votes.includes(userId)
        })),
        totalVotes: post.poll.totalVotes,
        isActive: post.poll.isActive,
        expiresAt: post.poll.expiresAt,
        allowMultipleVotes: post.poll.allowMultipleVotes
      }
    });
  } catch (error) {
    console.error("Vote error:", error);
    return reply.status(500).send({
      success: false,
      message: "Error recording vote",
      details: error.message
    });
  }
};