// import { User } from "../model/user.model.js";

// export const createUser = async (req, reply) => {
//   const { phoneNumber, username } = req.body;

//   let user = await User.findOne({ phoneNumber });
//   if (!user) {
//     user = new User({ phoneNumber, username });
//     await user.save();
//   }

//   reply.send({ success: true, user });
// };

// export const getUserProfile = async (req, reply) => {
//   const userId = req.params.id;
//   const user = await User.findById(userId).lean();

//   if (!user) {
//     return reply.status(404).send({ error: "User not found" });
//   }

//   reply.send({ success: true, user });
// };


import User from "../model/user.model.js";

export default (storage, bucketName) => ({
  addUser: async (req, reply) => {
    try {
      const parts = req.parts();

      let user_id, username, phone_number, latitude, longitude, fileBuffer, fileName;

      for await (const part of parts) {
        if (part.file) {
          fileBuffer = await part.toBuffer();
          fileName = part.filename;
          console.log(fileName)
        } else {
          switch (part.fieldname) {
            case "user_id":
              user_id = part.value;
              break;
            case "username":
              username = part.value;
              break;
            case "phoneNumber":
              phone_number = part.value;
              break;
            case "latitude":
              latitude = part.value;
              break;
            case "longitude":
              longitude = part.value;
              break;
          }
        }
      }

      if (!user_id || !username || !phone_number || !latitude || !longitude || !fileBuffer) {
        return reply.code(400).send({ message: "Missing required fields or file" });
      }

      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lon)) {
        return reply.code(400).send({ message: "Invalid latitude or longitude values" });
      }

      const options = { destination: fileName, gzip: true };
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

      reply.code(200).send({ message: "User inserted successfully!", user });
    } catch (error) {
      console.error("Error adding user:", error.message);
      reply.code(500).send({ message: "Error adding user", error: error.message });
    }
  },
});
