// import mongoose from "mongoose";

// export const connectDB = async (uri) => {
//   try {
//     await mongoose.connect(uri);
//     console.log("Connected to MongoDB ✅");
//   } catch (error) {
//     console.error("Error connecting to MongoDB:", error.message);
//   }
// };

import mongoose from "mongoose";
export const connectDB = async (uri) => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB ✅");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};
