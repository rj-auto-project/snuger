import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true }, // Unique user identifier
    phoneNumber: { type: String, required: true, unique: true }, // User's phone number
    username: { type: String, required: true }, // User's name
    profileImage: { type: String, default: "default-profile.jpg" }, // URL of the profile image
    snugScore: { type: Number, default: 0 }, // User's snug score
    totalSnugs: { type: Number, default: 0 }, // Total snugs received
    geo_coordinates: { 
      type: [Number], // Latitude and Longitude as [lat, lon]
      required: true,
      validate: {
        validator: function (v) {
          return v.length === 2 && !isNaN(v[0]) && !isNaN(v[1]);
        },
        message: "geo_coordinates must be an array of two numbers [lat, lon]",
      },
    },
    createdAt: { type: Date, default: Date.now }, // Timestamp for creation
    updatedAt: { type: Date, default: Date.now }, // Timestamp for the last update
  },
  { timestamps: true } // Automatically handle createdAt and updatedAt
);

export default mongoose.model("User", userSchema);
