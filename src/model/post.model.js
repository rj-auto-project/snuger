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
    audio: { type: String },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    totalVotes: { type: Number, default: 0 },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    reportOptions: [{ type: String }],
    isAnonymous: { type: Boolean, default: false },
    trendingPosition: { type: Number, default: 0 },
  },
  { timestamps: true }
);

postSchema.pre("save", function (next) {
  this.totalVotes = this.upvotes - this.downvotes;
  next();
});

export const Post = mongoose.model("Post", postSchema);
