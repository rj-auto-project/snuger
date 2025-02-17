import mongoose from "mongoose";

const helpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String },
    images: [{ type: String }],
    videos: [{ type: String }],
    helpType: { type: String },
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

helpSchema.index({ location: "2dsphere" });

export const Help = mongoose.model("Help", helpSchema);
