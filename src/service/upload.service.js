import { Storage } from "@google-cloud/storage";
import { credentials } from "../../credentials.js";

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: credentials,
});

export async function uploadFileToGCS(
  fileBuffer,
  fileName,
  bucketName = "snuger"
) {
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    await file.save(fileBuffer, { gzip: true });
    return `https://storage.googleapis.com/${bucketName}/${fileName}`;
  } catch (error) {
    throw new Error("File upload failed: " + error.message);
  }
}
