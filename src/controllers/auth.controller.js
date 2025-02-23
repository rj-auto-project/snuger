import { User } from "../model/user.model.js";
import { uploadFileToGCS } from "../service/upload.service.js";
import {
  generateSignUpTokens,
  generateTokens,
  verifyRefreshToken,
  verifySignUpToken,
} from "../utils/jwt.js";
import { auth } from "../config/firebase.js";
import mongoose from "mongoose";

export async function verifyFirebaseToken(request, reply) {
  try {
    const { firebaseToken } = request.body;

    if (!firebaseToken)
      return reply.status(400).send({ error: "firebase Token is required" });

    const { phone_number } = await auth.verifyIdToken(firebaseToken);
    const existingUser = await User.findOne({ phoneNumber: phone_number });
    if (existingUser) {
      const { accessToken, refreshToken } = generateTokens(existingUser._id);
      return reply.send({ user: existingUser, accessToken, refreshToken });
    } else {
      const signUpToken = generateSignUpTokens(phone_number);
      return reply.send({
        signUpToken,
        isNewUser: true,
        message: "Please complete registration using the signup token",
      });
    }
  } catch (error) {
    console.error("Firebase verification error:", error);
    return reply.code(401).send({ error: "Invalid Firebase token" });
  }
}

export async function createUser(request, reply) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const signUpToken = request.headers.authorization?.replace("Bearer ", "");

    if (!signUpToken) {
      return reply.code(400).send({ error: "SignUp token is required" });
    }

    const { phoneNumber } = verifySignUpToken(signUpToken);

    const existingUser = await User.findOne({ phoneNumber }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return reply.code(409).send({ error: "User already exists" });
    }

    const parts = request.parts();
    let name, username, profileImage, fileBuffer, fileName, location, fcmToken;

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
          case "location":
            location = part.value;
            break;
          case "fcmToken":
            fcmToken = part.value;
            break;
        }
      }
    }




    if (!name || !username) {
      await session.abortTransaction();
      session.endSession();
      return reply.code(400).send({ error: "Name and username are required" });
    }

    const existingUsername = await User.findOne({ username }).session(session);
    if (existingUsername) {
      await session.abortTransaction();
      session.endSession();
      return reply.code(409).send({ error: "Username already exists" });
    }

    if (fileBuffer) {
      profileImage = await uploadFileToGCS(fileBuffer, fileName, "snuger");
    }

    if (location) {
      try {
        const parsedLocation = JSON.parse(location);
        if (
          !Array.isArray(parsedLocation) ||
          parsedLocation.length !== 2 ||
          isNaN(parsedLocation[0]) ||
          isNaN(parsedLocation[1])
        ) {
          throw new Error(
            "Invalid location format. Expected [longitude, latitude]."
          );
        }
        location = { type: "Point", coordinates: parsedLocation };
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return reply.code(400).send({
          error: "Invalid location format",
          details: error.message,
        });
      }
    }
    const newUser = await User.create(
      [{ phoneNumber, name, username, profileImage, fcmToken, location }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const { accessToken, refreshToken } = generateTokens(newUser[0]._id);
    return reply.send({ accessToken, refreshToken, user: newUser[0] });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("User creation error:", error);
    return reply
      .code(500)
      .send({ error: "Error creating user", details: error.message });
  }
}

export async function refreshToken(request, reply) {
  try {
    const { refreshToken } = request.body;
    const decoded = verifyRefreshToken(refreshToken);
    const tokens = generateTokens(decoded.userId);
    return reply.send(tokens);
  } catch (error) {
    return reply.code(401).send({ error: "Invalid refresh token", error });
  }
}
