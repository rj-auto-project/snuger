import { appSettings } from "../model/userCounter.model.js"; // Adjust the import path based on your file structure

export const updateUserCount = async (req, res) => {
  try {
    const settings = await appSettings.findOne();

    if (!settings) {
      const newSettings = new appSettings();
      newSettings.webUserCount = "1";
      await newSettings.save();
      return res.status(201).send({ message: "User count incremented", data: newSettings });
    }

    // Increment the webUserCount (convert to number, increment, and save)
    settings.webUserCount = (parseInt(settings.webUserCount) + 1).toString();
    await settings.save();

    res.status(200).send({ message: "User count incremented", data: settings });
  } catch (error) {
    console.error("Error incrementing user count:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};