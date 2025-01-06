// const credentials = require('./credentials');
// const express = require("express");
// const multer = require("multer");
// const path = require("path");
// const mongoose = require("mongoose");
// const userRoute = require("./routes/user");

// const { Storage } = require("@google-cloud/storage");
// const storage = new Storage({
//   projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
//   credentials:credentials,
// });
// const bucketName = "snuger";

// const app = express();

// const upload = multer({
//   storage: multer.memoryStorage(),
// });

// const mongoURI = process.env.MONGOURI;
// mongoose.connect(mongoURI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });
// mongoose.connection.on("connected", () => console.log("Connected to MongoDB"));

// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));

// // register user route
// app.use("/user", userRoute(upload, storage, bucketName));

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

import fastify from "fastify";
import { connectDB } from "./src/config/connect.js";
import env from "./src/config/env.js";
import rateLimitPlugin from "./src/plugin/ratelimiter.js";
import fastifyCors from "@fastify/cors";
import { errorHandler } from "./src/utils/error.js";
import { registerRoutes } from "./src/routes/index.js";

const app = fastify({ logger: true });

// Plugins
app.register(rateLimitPlugin);
app.register(fastifyCors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
});
//Error handler
app.setErrorHandler(errorHandler);
// Routes
app.register(registerRoutes)
// Start Server
const start = async () => {
  try {
    await connectDB(env.MONGO_URI);

    app.listen({ port: env.PORT, host: "0.0.0.0" }, (err, addr) => {
      if (err) {
        console.error(err);
      } else {
        console.log(`Server is running at http://localhost:${env.PORT}`);
      }
    });
    console.log(`Server running at http://localhost:${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
