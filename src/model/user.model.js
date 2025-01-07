import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    phoneNumber: { type: Number, unique: true , required: true },
    username: { type: String, unique: true, required: true },
    name: { type: String },
    profileImage: { type: String, default: "default-profile.jpg" },
    snugScore: { type: Number, default: 0 },
    totalSnugs: { type: Number, default: 0 },
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

// Create a geospatial index for the location field
userSchema.index({ location: "2dsphere" });
  
export const User = mongoose.model("User", userSchema);
