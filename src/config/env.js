import dotenv from "dotenv";
dotenv.config();

export default {
  PORT: process.env.PORT || 6789,
  MONGO_URI: process.env.MONGOURI,
};
