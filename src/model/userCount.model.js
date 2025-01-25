import mongoose from "mongoose";

const userCountSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true, // Ensure email is provided
      unique: true, // To prevent duplicate emails
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 
        "Please provide a valid email address"
      ],
    },
  },
  { timestamps: true }
);

export const appSettings = mongoose.model("launchTimeUsers", userCountSchema);
