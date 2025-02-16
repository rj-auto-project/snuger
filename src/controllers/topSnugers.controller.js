import { User } from "../model/user.model.js";

import mongoose from "mongoose";

// Controller to fetch top snugers
export const getTopSnuger = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { longitude, latitude, groupId } = req.query;

    // Validate required parameters
    if (!longitude || !latitude) {
      return reply.status(400).send({
        success: false,
        message: "longitude and latitude are required",
      });
    }
    if (!groupId) {
      return reply.status(400).send({
        success: false,
        message: "groupId is required",
      });
    }
    
    // Fetch top 10 snugers within a 5km radius
    const geoQuery = {
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: 5000, // 5km radius
        },
      },
    };
    const topSnugersInRadius = await User.find(geoQuery)
    .sort({ snugScore: -1 }) // Sort by snugScore in descending order
    .limit(10)
    .session(session);
    
    // Fetch top 10 snugers in the specified group
    const groupQuery = { groupIDs: new mongoose.Types.ObjectId(groupId) };
    const topSnugersInGroup = await User.find(groupQuery)
      .sort({ snugScore: -1 }) // Sort by snugScore in descending order
      .limit(10)
      .session(session);

    await session.commitTransaction();
    session.endSession();

    return reply.status(200).send({
      success: true,
      data: {
        topSnugersInRadius,
        topSnugersInGroup,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    reply.status(500).send({
      success: false,
      message: "Failed to fetch top snugers",
      error: error.message,
    });
  }
};