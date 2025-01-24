import mongoose from "mongoose";
import { Storage } from "@google-cloud/storage";
import { credentials } from "../../credentials.js";
import { Help } from "../model/help.model.js";

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: credentials,
});
const bucketName = "snuger";

export const submitHelp = async (req, reply) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const parts = req.parts();
    let userId, content, locations, helpType;
    let imageURLs = [],
      videoURLs = [];

    for await (const part of parts) {
      if (part.file) {
        const fileBuffer = await part.toBuffer();
        const fileName = part.filename;
        const fileType = part.mimetype.split("/")[0];
        const options = { destination: fileName, gzip: true };

        try {
          const bucket = storage.bucket(bucketName);
          const file = bucket.file(fileName);
          await file.save(fileBuffer, options);
        } catch (error) {
          return reply.status(500).send({
            error: "Media file upload failed",
            details: error.message,
          });
        }

        const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        if (fileType === "image") {
          imageURLs.push(publicUrl);
        } else if (fileType === "video") {
          videoURLs.push(publicUrl);
        }
      } else {
        switch (part.fieldname) {
          case "userId":
            userId = part.value;
            break;
          case "location":
            locations = part.value;
            break;
          case "content":
            content = part.value;
            break;
          case "helpType":
            helpType = part.value;
            break;
        }
      }
    }
    const parsedLocation = locations ? JSON.parse(locations) : undefined;
    const post = new Help({
      userId,
      content,
      location: parsedLocation
        ? { type: "Point", coordinates: parsedLocation }
        : undefined,
      images: imageURLs,
      videos: videoURLs,
      helpType: helpType
    });
    await post.save({ session });
    await session.commitTransaction();
    session.endSession();

    reply.status(200).send({
      message: "Help created successfully",
      post,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    reply.status(500).send({
      error: "Error creating post",
      details: error.message,
    });
  }
};
