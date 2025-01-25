import { appSettings } from "../model/userCount.model.js"; // Adjust the import path based on your file structure

export const updateUserCount = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email is provided
    if (!email) {
      return res.status(400).send({ message: "Email is required" });
    }

    // Check if the email already exists in the database
    let user = await appSettings.findOne({ email });

    if (!user) {
      // If user doesn't exist, create a new entry
      user = new appSettings({ email, webUserCount: "1" });
      await user.save();
      return res.status(201).send({ message: "New user added", data: user });
    }

    res.status(200).send({ message: "User count incremented", data: user });
  } catch (error) {
    console.error("Error updating user count:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};
