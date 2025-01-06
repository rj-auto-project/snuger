import { User } from "../model/user.model.js";

export const createUser = async (req, reply) => {
  const { phoneNumber, username } = req.body;

  let user = await User.findOne({ phoneNumber });
  if (!user) {
    user = new User({ phoneNumber, username });
    await user.save();
  }

  reply.send({ success: true, user });
};

export const getUserProfile = async (req, reply) => {
  const userId = req.params.id;
  const user = await User.findById(userId).lean();

  if (!user) {
    return reply.status(404).send({ error: "User not found" });
  }

  reply.send({ success: true, user });
};
