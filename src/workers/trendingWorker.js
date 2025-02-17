import cron from "node-cron";
import { updateTrendingPositions } from "../utils/trending.js";

cron.schedule("*/30 * * * *", async () => {
  console.log("🔄 Running trending position update...");
  await updateTrendingPositions();
  console.log("✅ Trending positions updated!");
});

console.log("🚀 Cron Job for Trending Positions Started...");
