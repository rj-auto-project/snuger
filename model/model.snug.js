var mongoose = require("mongoose");
var Schema = mongoose.Schema;

/**
 *snug schema
 */
var snugSchema = new Schema(
  {
    snug_id: {
      type: String,
      required: true,
      unique: true,
    },
    user_id: {
      type: String,
      required: true,
    },
    snug_text_content: {
      type: String,
      default: "",
    },
    snug_media: {
      type: [String],
      default: [],
    },
    upvotes: {
      type: Number,
      default: 0,
    },
    downvotes: {
      type: Number,
      default: 0,
    },
    reports: {
      type: [
        {
          reason: String,
          reported_by: String,
        },
      ],
      default: [],
    },
    geo_coordinates: {
      type: [Number],
      validate: {
        validator: function (value) {
          return value.length === 2;
        },
        message:
          "geo_coordinates must be an array of two numbers [latitude, longitude].",
      },
    },
  },
  { collection: "snug" }
);

module.exports = mongoose.model("Snug", snugSchema);
