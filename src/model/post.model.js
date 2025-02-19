import mongoose from "mongoose";

// Define Poll Option Schema
const pollOptionSchema = new mongoose.Schema({
  text: { 
    type: String, 
    required: true 
  },
  votes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  voteCount: { 
    type: Number, 
    default: 0 
  }
});

// Define Poll Schema
const pollSchema = new mongoose.Schema({
  question: { 
    type: String, 
    required: true 
  },
  options: [pollOptionSchema],
  expiresAt: { 
    type: Date,
    required: true 
  },
  totalVotes: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  allowMultipleVotes: { 
    type: Boolean, 
    default: false 
  }
});

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
    totalUpvotes: { type: Number, default: 0 },
    totalDownvotes: { type: Number, default: 0 },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    totalVotes: { type: Number, default: 0 },
    totalComment: { type: Number, default: 0 },
    voteStatus: { type: String, default: "None" },
    postStatus: { 
      type: String, 
      enum: ["Blocked", "Unblocked"], 
      default: "Unblocked" 
    },
    isAnonymous: { type: Boolean, default: false },
    trendingPosition: { type: Number, default: 0 },
    groupID: { type: mongoose.Schema.Types.ObjectId, ref: "Group" , default: null},
    poll: { 
      type: pollSchema,
      default: null
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      // always put longitude at 0th and latitude at 1st position
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
      type: [Number],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.every((num) => typeof num === "number");
        },
        message: "Embeddings must be an array of numbers",
      },
      default: [],
    },
  },
  { timestamps: true }
);

// Pre-save middleware to update totalVotes
postSchema.pre("save", function (next) {
  this.totalVotes = this.totalUpvotes - this.totalDownvotes;
  
  // Update poll total votes if poll exists
  if (this.poll) {
    this.poll.totalVotes = this.poll.options.reduce((sum, option) => sum + option.voteCount, 0);
  }
  
  next();
});

// Add method to vote on a poll
postSchema.methods.votePoll = async function(optionId, userId) {
  if (!this.poll || !this.poll.isActive) {
    throw new Error('Poll is not active or does not exist');
  }

  if (this.poll.expiresAt < new Date()) {
    this.poll.isActive = false;
    throw new Error('Poll has expired');
  }

  const option = this.poll.options.id(optionId);
  if (!option) {
    throw new Error('Poll option not found');
  }

  // Check if user has already voted
  const hasVoted = this.poll.options.some(opt => 
    opt.votes.includes(userId)
  );

  if (hasVoted && !this.poll.allowMultipleVotes) {
    throw new Error('User has already voted on this poll');
  }

  // Add vote
  option.votes.push(userId);
  option.voteCount += 1;
  this.poll.totalVotes += 1;

  await this.save();
  return this;
};

// Add method to check if poll is expired
postSchema.methods.checkPollExpiry = function() {
  if (this.poll && this.poll.isActive && this.poll.expiresAt < new Date()) {
    this.poll.isActive = false;
    return true;
  }
  return false;
};

postSchema.index({ location: "2dsphere" });

export const Post = mongoose.model("Post", postSchema);