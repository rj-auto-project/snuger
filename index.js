const credentials = require('./credentials');
const express = require("express");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const userRoute = require("./routes/user");

const { Storage } = require("@google-cloud/storage");
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials:credentials,
});
const bucketName = "snuger";

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
});

const mongoURI = process.env.MONGOURI;
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on("connected", () => console.log("Connected to MongoDB"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// register user route
app.use("/user", userRoute(upload, storage, bucketName));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
