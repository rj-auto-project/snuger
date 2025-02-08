import mongoose from "mongoose";
import { Group } from "../model/groups.model.js";
import { User } from "../model/user.model.js";

// create Group
export const createGroup = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const { name, groupID, members, coordinates } = req.body;

  if (!coordinates || !Array.isArray(coordinates)) {
    return reply.status(400).send({ error: "Invalid or missing coordinates" });
  }

  try {
    const group = new Group({
      name,
      groupID,
      members,
      location: {
        type: "Polygon",
        coordinates,
      },
    });

    const result = await group.save();
    return reply.status(201).send({
      message: "Group created successfully",
      group: result,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return reply.status(500).send({ error: "Failed to create group" });
  }
};

// assign Group to the user
export const assignGroup = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const { lat, long, userID } = req.body;

  if (typeof lat !== "number" || typeof long !== "number") {
    return reply.status(400).send({
      error: "Invalid input. Provide valid latitude and longitude as numbers.",
    });
  }

  try {
    // GeoJSON Point
    const point = {
      type: "Point",
      coordinates: [long, lat], // GeoJSON expects [longitude, latitude]
    };

    // Query using $geoIntersects
    const matchingPolygon = await Group.findOne({
      location: {
        $geoIntersects: {
          $geometry: point,
        },
      },
    });

    if (!matchingPolygon) {
      return reply.send({
        isInside: false,
        message: "user is not inside any grup location.",
      });
    }
    const updatedUser = await User.findOneAndUpdate(
      { _id: userID },
      { 
        $addToSet: { 
          groupIDs: matchingPolygon._id.toString() // Convert ObjectId to string
        } 
      },
      { new: true, session }
    );
    console.log(updatedUser)
    if (!updatedUser) {
      throw new Error("User not found.");
    }
    await Group.findByIdAndUpdate(
      matchingPolygon._id,
      { 
        $addToSet: { 
          members: userID 
        } 
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return reply.send({
      isInside: true,
      message: "user has joined the group",
      group: {
        id: matchingPolygon._id,
        name: matchingPolygon.name
      },
      user: updatedUser,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return reply.status(500).send({ error: "Failed to assign group" });
  }
};
