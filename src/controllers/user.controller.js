import mongoose from "mongoose";
import { User } from "../model/user.model.js";
import { Storage } from "@google-cloud/storage";
import { credentials } from "../../credentials.js";

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: credentials,
});
const bucketName = "snuger";

// create new user
export const createUser = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const parts = req.parts();
    let name, username, phoneNumber, location, fileBuffer, fileName;

    for await (const part of parts) {
      if (part.file) {
        fileBuffer = await part.toBuffer();
        fileName = part.filename;
      } else {
        switch (part.fieldname) {
          case "name":
            name = part.value;
            break;
          case "username":
            username = part.value;
            break;
          case "phoneNumber":
            phoneNumber = part.value;
            break;
          case "location":
            location = part.value;
            break;
        }
      }
    }

    if (!name || !username || !phoneNumber || !fileBuffer) {
      return reply.code(400).send({
        error: "Missing required fields or file",
      });
    }

    if (
      location &&
      (!Array.isArray(JSON.parse(location)) ||
        JSON.parse(location).length !== 2 ||
        isNaN(JSON.parse(location)[0]) ||
        isNaN(JSON.parse(location)[1]))
    ) {
      throw new Error(
        "Invalid location format. Expected [longitude, latitude]."
      );
    }

    let existingUser_ph_num = await User.findOne({ phoneNumber }).session(session);
    let existingUsername = await User.findOne({ username }).session(session);
    if (existingUser_ph_num) {
      return reply.status(409).send({
        error: "User with this Phone Number already exists",
      });
    }
    if (existingUsername) {
      return reply.status(409).send({
        error: "this Username already exists",
      });
    }
    const parsedLocation = location ? JSON.parse(location) : undefined;
    const options = { destination: fileName, gzip: true };
    try {
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(fileName);
      await file.save(fileBuffer, options);
    } catch (error) {
      return reply
        .status(500)
        .send({
          error: "media file upload failed",
          details: error.message,
        });
    }

    const profileImageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    const user = new User({
      phoneNumber,
      username,
      name,
      location: parsedLocation
        ? { type: "Point", coordinates: parsedLocation }
        : undefined,
      profileImage: profileImageUrl,
    });

    await user.save({ session });
    await session.commitTransaction();
    session.endSession();

    reply.send({ success: true, user });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    reply.status(500).send({
      error: "Failed to create or update user",
      details: error.message,
    });
  }
};

// get user details
export const getUserProfile = async (req, reply) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).lean();

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    reply.send({ success: true, user });
  } catch (error) {
    reply
      .status(500)
      .send({ error: "Failed to fetch user profile", details: error.message });
  }
};

// Update user data individually
export const updateUser = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const parts = req.parts();
    let userId, name, username, phoneNumber, fileBuffer, fileName;

    for await (const part of parts) {
      if (part.file) {
        fileBuffer = await part.toBuffer();
        fileName = part.filename;
      } else {
        switch (part.fieldname) {
          case "userId":
            userId = part.value;
            break;
          case "name":
            name = part.value;
            break;
          case "username":
            username = part.value;
            break;
          case "phoneNumber":
            phoneNumber = part.value;
            break;
        }
      }
    }

    if (!userId) {
      return reply.code(400).send({
        error: "User ID is required",
      });
    }

    const user = await User.findById(userId).session(session);

    if (!user) {
      return reply.code(404).send({
        error: "User not found",
      });
    }

    if (fileBuffer) {
      const options = { destination: fileName, gzip: true };
      try {
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(fileName);
        await file.save(fileBuffer, options);
        user.profileImage = `https://storage.googleapis.com/${bucketName}/${fileName}`;
      } catch (error) {
        return reply
          .status(500)
          .send({
            error: "Media file upload failed",
            details: error.message,
          });
      }
    }

    if (phoneNumber) {
      const existingUser_ph_num = await User.findOne({
        phoneNumber,
        _id: { $ne: userId },
      }).session(session);

      if (existingUser_ph_num) {
        return reply.status(409).send({
          error: "User with this Phone Number already exists",
        });
      }
      user.phoneNumber = phoneNumber;
    }

    if (username) {
      const existingUsername = await User.findOne({
        username,
        _id: { $ne: userId },
      }).session(session);

      if (existingUsername) {
        return reply.status(409).send({
          error: "This Username already exists",
        });
      }
      user.username = username;
    }

    if (name) {
      user.name = name;
    }

    await user.save({ session });
    await session.commitTransaction();
    session.endSession();

    reply.send({ success: true, user });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    reply.status(500).send({
      error: "Failed to update user",
      details: error.message,
    });
  }
};
