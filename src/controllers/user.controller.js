import mongoose from "mongoose";
import { User } from "../model/user.model.js";

export const createUser = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { phoneNumber, username } = req.body;

    let user = await User.findOne({ phoneNumber }).session(session);

    if (!user) {
      user = new User({ phoneNumber, username });
      await user.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    reply.send({ success: true, user });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    reply
      .status(500)
      .send({ error: "Failed to create or find user", details: error.message });
  }
};

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
