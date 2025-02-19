import { Post } from "../model/post.model.js";

const FIXED_RADIUS = 5000; // 5km in meters
const EARTH_RADIUS = 6378100; // Earth's radius in meters
const RADIUS_IN_RADIANS = FIXED_RADIUS / EARTH_RADIUS; // Pre-calculate the radius in radians

export const getHeatmapData = async (request, reply) => {
  try {
    const { latitude, longitude } = request.query;

    if (!latitude || !longitude) {
      return reply.code(400).send({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    // Convert string parameters to numbers
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return reply.code(400).send({
        success: false,
        message: "Invalid coordinates provided",
      });
    }

    // Find posts within 5km radius that have a non-null groupId
    const posts = await Post.countDocuments({
      location: {
        $geoWithin: {
          $centerSphere: [
            [lng, lat], // MongoDB uses [longitude, latitude] order
            RADIUS_IN_RADIANS,
          ],
        },
      },
      groupID: { 
        $exists: true,  // Field must exist
        $ne: null      // Value must not be null
      }
    });

    return reply.code(200).send({
      success: true,
      data: {
        count: posts,
        coordinates: {
          latitude: lat,
          longitude: lng,
        },
        radius: FIXED_RADIUS,
        radiusInKm: FIXED_RADIUS / 1000,
        timestamp: "2025-02-07 20:27:11",
      },
    });
  } catch (error) {
    console.error("Heatmap Error:", error);
    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getBatchHeatmapData = async (request, reply) => {
  try {
    const { points } = request.body;
    
    if (!Array.isArray(points) || points.length === 0) {
      return reply.code(400).send({
        success: false,
        message: "Points array is required and must not be empty",
      });
    }

    // Validate all points before processing
    const isValidPoints = points.every(point => {
      const lat = parseFloat(point.latitude);
      const lng = parseFloat(point.longitude);
      return !isNaN(lat) && !isNaN(lng) && 
             lat >= -90 && lat <= 90 && 
             lng >= -180 && lng <= 180;
    });

    if (!isValidPoints) {
      return reply.code(400).send({
        success: false,
        message: "Invalid coordinates found in points array",
      });
    }

    const results = await Promise.all(
      points.map(async ({ latitude, longitude }) => {
        const count = await Post.countDocuments({
          location: {
            $geoWithin: {
              $centerSphere: [
                [parseFloat(longitude), parseFloat(latitude)],
                RADIUS_IN_RADIANS,
              ],
            },
          },
          groupID: { 
            $exists: true,  // Field must exist
            $ne: null      // Value must not be null
          }
        });

        return {
          coordinates: { latitude, longitude },
          count,
          radius: FIXED_RADIUS,
          radiusInKm: FIXED_RADIUS / 1000
        };
      })
    );

    return reply.code(200).send({
      success: true,
      data: results,
      metadata: {
        timestamp: "2025-02-07 20:27:11",
        totalPoints: points.length
      }
    });
  } catch (error) {
    console.error("Batch Heatmap Error:", error);
    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};