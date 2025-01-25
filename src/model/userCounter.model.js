import mongoose from "mongoose";

const userCountSchema = new mongoose.Schema(
  {
    webUserCount: {
      type: String,
      default: "0",
      required: true,
    },
  },
  { timestamps: true }
);

export const appSettings = mongoose.model("appSettings", userCountSchema);
