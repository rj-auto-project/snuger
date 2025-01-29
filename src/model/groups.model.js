import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String },
    members: [{ type: String }],
    location: {
      type: {
        type: String,
        enum: ["Polygon"], // GeoJSON type must be "Polygon"
        required: true,
        default: "Polygon",
      },
      coordinates: {
        type: [[[Number]]], // Array of arrays of arrays for GeoJSON Polygon
        required: true,
        validate: {
          validator: function (v) {
            return (
              Array.isArray(v) &&
              v.length > 0 &&
              v.every(
                (ring) =>
                  Array.isArray(ring) &&
                  ring.length > 0 &&
                  ring.every(
                    (point) =>
                      Array.isArray(point) &&
                      point.length === 2 &&
                      !isNaN(point[0]) &&
                      !isNaN(point[1])
                  )
              )
            );
          },
          message: "coordinates must be an array of rings, each containing arrays of two numbers [lon, lat]",
        },
        default: [
          [
            [87.2620756305604, 24.285815044316077],
            [87.2630756305604, 24.286815044316077],
            [87.2640756305604, 24.287815044316077],
            [87.2620756305604, 24.285815044316077], // Closing the polygon
          ],
        ],
      },
    },
  },
  { timestamps: true }
);

groupSchema.index({ location: "2dsphere" });

export const Group = mongoose.model("Group", groupSchema);
