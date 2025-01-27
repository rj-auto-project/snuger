// import { Double } from "mongodb";
import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String },
    images: [{ type: String }],
    videos: [{ type: String }],
    audios: [{ type: String }],
    totalUpvotes: { type: Number, default: 0 }, // Total count of upvotes
    totalDownvotes: { type: Number, default: 0 }, // Total count of downvotes
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Array of user IDs who upvoted
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Array of user IDs who downvoted
    totalVotes: { type: Number, default: 0 },
    totalComment: { type: Number, default: 0 },
    voteStatus: { type: String, default: "None" },
    reportOptions: [{ type: String }],
    isAnonymous: { type: Boolean, default: false },
    trendingPosition: { type: Number, default: 0 },
    groupID: {type: String, default:""},
    location: {
      type: {
        type: String,
        enum: ["Point"], // GeoJSON type must be "Point"
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function (v) {
            return v.length === 2 && !isNaN(v[0]) && !isNaN(v[1]);
          },
          message: "geo_coordinates must be an array of two numbers [lon, lat]",
        },
        default: [87.2620756305604, 24.285815044316077],
      },
    },
    embedding: {
      type: [Number], // Array of floating-point numbers
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.every((num) => typeof num === "number");
        },
        message: "Embeddings must be an array of numbers",
      },
      default: [], // Default value as an empty array
    },
  },
  { timestamps: true }
);

postSchema.pre("save", function (next) {
  this.totalVotes = this.totalUpvotes - this.totalDownvotes;
  next();
});

postSchema.index({ location: "2dsphere" });

export const Post = mongoose.model("Post", postSchema);
