import mongoose from "mongoose";
import { Post } from "../model/post.model.js";
import { Storage } from "@google-cloud/storage";
import { credentials } from "../../credentials.js";

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
    let userId, content, isAnonymous, locations;
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
        }
      }
    }
    const parsedLocation = locations ? JSON.parse(locations) : undefined;
    console.log(parsedLocation)
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
    });

    console.log(userId,isAnonymous,locations, imageURLs,videoURLs,audioURLs)
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


// get post
export const getPosts = async (req, reply) => {
  try {
    const posts = await Post.find()
      .populate("userId", "username profileImage")
      .lean();

    reply.send({ success: true, posts });
  } catch (error) {
    reply
      .status(500)
      .send({ error: "Failed to fetch posts", details: error.message });
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