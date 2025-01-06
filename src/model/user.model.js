import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true },
    username: { type: String },
    profileImage: { type: String, default: "default-profile.jpg" },
    snugScore: { type: Number, default: 0 },
    totalSnugs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
