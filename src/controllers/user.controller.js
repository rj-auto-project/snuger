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

    console.log(name, username, phoneNumber, location, fileBuffer, fileName);

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

    let existingUser_ph_num = await User.findOne({ phoneNumber }).session(
      session
    );
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
      return reply.status(500).send({
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
    const requesterId = req.user.userId; // Get authenticated user's ID
    const requestedUserId = req.params.id;

    if (!requesterId) {
      return reply.status(401).send({ error: "Authentication required" });
    }

    const user = await User.findById(requestedUserId).lean();

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    // Optional: Check if the requester has permission to view this profile
    // For example, if you want to restrict certain fields for non-self requests
    const isOwnProfile = requesterId.toString() === requestedUserId.toString();

    // Remove sensitive information if not viewing own profile
    if (!isOwnProfile) {
      delete user.phoneNumber;
      // Add other sensitive fields to remove as needed
    }

    reply.send({ success: true, user });
  } catch (error) {
    reply
      .status(500)
      .send({ error: "Failed to fetch user profile", details: error.message });
  }
};


export const updateUser = async (req, reply) => {
  let retries = 3; // Number of retries for write conflicts
  let success = false;
  
  while (retries > 0 && !success) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const parts = req.parts();
      let userId, name, username, phoneNumber, fileBuffer, fileName, location, fcmToken;
      
      // Process file upload outside the transaction to reduce transaction scope
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
            case "location":
              location = part.value;
              break;
            case "fcmToken":
              fcmToken = part.value;
              break;
          }
        }
      }

      if (!userId) {
        await session.abortTransaction();
        session.endSession();
        return reply.code(400).send({ error: "User ID is required" });
      }

      // Handle file upload outside of transaction
      let profileImageUrl;
      if (fileBuffer) {
        try {
          const bucket = storage.bucket(bucketName);
          const file = bucket.file(fileName);
          await file.save(fileBuffer, { gzip: true });
          profileImageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          return reply.code(500).send({ error: "Media file upload failed", details: error.message });
        }
      }

      let updateFields = {};
      
      // Handle username uniqueness
      if (username) {
        const existingUsername = await User.findOne({ 
          username, 
          _id: { $ne: userId } 
        }).session(session);
        
        if (existingUsername) {
          await session.abortTransaction();
          session.endSession();
          return reply.code(409).send({ error: "Username already exists" });
        }
        updateFields.username = username;
      }

      // Handle phoneNumber uniqueness
      if (phoneNumber) {
        const existingPhoneNumber = await User.findOne({ 
          phoneNumber, 
          _id: { $ne: userId } 
        }).session(session);
        
        if (existingPhoneNumber) {
          await session.abortTransaction();
          session.endSession();
          return reply.code(409).send({ error: "User with this Phone Number already exists" });
        }
        updateFields.phoneNumber = phoneNumber;
      }

      // Add profile image URL to update fields if available
      if (profileImageUrl) {
        updateFields.profileImage = profileImageUrl;
      }
      

      // Handle location update
      if (location) {
        try {
          const parsedLocation = JSON.parse(location);
          if (!Array.isArray(parsedLocation) || 
              parsedLocation.length !== 2 || 
              isNaN(parsedLocation[0]) || 
              isNaN(parsedLocation[1])) {
            throw new Error("Invalid location format. Expected [longitude, latitude]. ");
          }
          updateFields.location = { type: "Point", coordinates: parsedLocation };
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          return reply.code(400).send({ error: "Invalid location format", details: error.message });
        }
      }

      if (name) updateFields.name = name;
      if (fcmToken) updateFields.fcmToken = fcmToken;

      // Perform the actual update in transaction
      const updatedUser = await User.findOneAndUpdate(
        { _id: userId },
        { $set: updateFields },
        { new: true, session }
      );

      if (!updatedUser) {
        await session.abortTransaction();
        session.endSession();
        return reply.code(404).send({ error: "User not found" });
      }

      // Successfully completed the transaction
      await session.commitTransaction();
      session.endSession();
      success = true;
      reply.send({ success: true, user: updatedUser });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      
      // Check if it's a write conflict and we have retries left
      if ((error.message.includes("Write conflict") || 
          error.message.includes("WriteConflict")) && 
          retries > 1) {
        retries--;
        console.log(`Write conflict occurred. Retrying (${retries} attempts left)...`);
        // Add a small delay before retrying to reduce chance of another conflict
        await new Promise(resolve => setTimeout(resolve, 100 * (4 - retries)));
      } else {
        // If not a write conflict or no more retries, exit the retry loop
        retries = 0;
        reply.code(500).send({ 
          error: "Failed to update user", 
          details: error.message 
        });
      }
    }
  }
};