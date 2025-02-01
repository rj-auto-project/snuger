import { User } from "../model/user.model.js";
import { uploadFileToGCS } from "../service/upload.service.js";
import {
  generateSignUpTokens,
  generateTokens,
  verifyRefreshToken,
  verifySignUpToken,
} from "../utils/jwt.js";

export async function verifyFirebaseToken(request, reply) {
  try {
    const { firebaseToken } = request.body;

    if (!firebaseToken)
      return reply.status(400).send({ error: "firebase Token is required" });

    // const { phone_number } = await auth.verifyIdToken(firebaseToken);
    const existingUser = await User.findOne({ phoneNumber: firebaseToken });

    if (existingUser) {
      const { accessToken, refreshToken } = generateTokens(existingUser._id);
      return reply.send({ user: existingUser, accessToken, refreshToken });
    } else {
      const signUpToken = generateSignUpTokens(firebaseToken);
      return reply.send({
        signUpToken,
        isNewUser: true,
        message: "Please complete registration using the signup token",
      });
    }
  } catch (error) {
    console.error("Firebase verification error:", error);
    reply.code(401).send({ error: "Invalid Firebase token" });
  }
}

export async function createUser(request, reply) {
  try {
    const signUpToken = request.headers.authorization?.replace("Bearer ", "");

    if (!signUpToken) {
      return reply.code(400).send({ error: "SignUp token is required" });
    }

    const { phoneNumber } = verifySignUpToken(signUpToken);
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return reply.code(409).send({ error: "User already exists" });
    }

    const parts = request.parts();
    let name, username, profileImage, fileBuffer, fileName;

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
        }
      }
    }

    if (!name || !username) {
      return reply.code(400).send({ error: "Name and username are required" });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return reply.code(409).send({ error: "Username already exists" });
    }

    if (fileBuffer) {
      profileImage = await uploadFileToGCS(fileBuffer, fileName, "snuger");
    }

    const newUser = await User.create({
      phoneNumber,
      name,
      username,
      profileImage,
    });

    const { accessToken, refreshToken } = generateTokens(newUser._id);
    return reply.send({
      accessToken,
      refreshToken,
      user: newUser,
    });
  } catch (error) {
    console.error("User creation error:", error);
    reply
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
    reply.code(401).send({ error: "Invalid refresh token", error });
  }
}
