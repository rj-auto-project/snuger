const express = require("express");
const router = express.Router();
const User = require("../model/model.user");

module.exports = (upload, storage, bucketName) => {
  router.post("/add", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send({ message: "No image uploaded" });
      }

      const { user_id, username, phone_number, latitude, longitude } = req.body;

      if (!user_id || !username || !phone_number || !latitude || !longitude) {
        return res.status(400).send({ message: "Missing required fields" });
      }

      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).send({ message: "Invalid latitude or longitude values" });
      }

      const fileName = req.file.originalname;
      const fileBuffer = req.file.buffer;

      const options = {
        destination: fileName,
        gzip: true,
      };

      const bucket = storage.bucket(bucketName);
      const file = bucket.file(fileName);
      await file.save(fileBuffer, options);

      const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

      const user = new User({
        user_id,
        username,
        phone_number,
        user_img: publicUrl,
        snug_score: 0,
        geo_coordinates: [lat, lon],
      });
      await user.save();

      res.status(200).send({
        message: "User inserted to database successfully!",
        user,
      });
    } catch (error) {
      console.error("Error adding user:", error.message);
      res.status(500).send({
        message: "Error adding user to database",
        error: error.message,
      });
    }
  });

  return router;
};
