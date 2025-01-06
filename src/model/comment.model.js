var mongoose = require("mongoose"),
  Schema = mongoose.Schema;

/**
 *comment schema
 */
var commentSchema = new Schema(
  {
    snug_id: {
      type: String,
      required: true,
    },
    comment_id: {
      type: String,
      required: true,
      unique: true,
    },
    user_id: {
      type: String,
      required: true,
    },
    reply: {
      type: [{ String: String }],
      default: [0],
    },
  },
  { collection: "comment" }
);

module.exports = mongoose.model("Comment", commentSchema);
