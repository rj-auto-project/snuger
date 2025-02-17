import { Post } from "../model/post.model.js";

export const updateTrendingPositions = async () => {
  try {
    console.log("Updating trending positions...");

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const posts = await Post.find({
      $or: [
        { createdAt: { $gte: tenMinutesAgo } },
        { updatedAt: { $gte: tenMinutesAgo } },
      ],
      location: { $exists: true },
    });

    if (posts.length === 0) {
      console.log("No recent posts to update.");
      return;
    }

    const bulkUpdates = [];

    for (const post of posts) {
      const { coordinates } = post.location;

      const trendingPosts = await Post.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates },
            distanceField: "distance",
            maxDistance: 5000,
            spherical: true,
          },
        },
        { $sort: { totalVotes: -1 } },
        { $project: { _id: 1 } },
      ]);

      const rankingIndex = trendingPosts.findIndex((p) =>
        p._id.equals(post._id)
      );

      if (rankingIndex !== -1) {
        bulkUpdates.push({
          updateOne: {
            filter: { _id: post._id },
            update: { trendingPosition: rankingIndex + 1 },
          },
        });
      }
    }

    if (bulkUpdates.length > 0) {
      await Post.bulkWrite(bulkUpdates);
    }

    console.log("Trending positions updated successfully!");
  } catch (error) {
    console.error("Error updating trending positions:", error);
  }
};
