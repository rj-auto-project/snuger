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
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    totalVotes: { type: Number, default: 0 },
    totalComment: { type: Number, default: 0 },
    reportOptions: [{ type: String }],
    isAnonymous: { type: Boolean, default: false },
    trendingPosition: { type: Number, default: 0 },
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
  },
  { timestamps: true }
);

postSchema.pre("save", function (next) {
  this.totalVotes = this.upvotes - this.downvotes;
  next();
});

postSchema.index({ location: "2dsphere" });

export const Post = mongoose.model("Post", postSchema);
