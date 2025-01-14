import { MongoClient } from "mongodb";
import { getEmbedding } from "../service/getEmbedding.service.js";

/**
 * Performs combined search across users and posts with location awareness
 * @param {string} searchQuery - The search text
 * @param {Object} userCoords - User coordinates {longitude, latitude}
 * @param {number} maxDistance - Maximum distance in meters (default 10km)
 */
// searchQuery, userCoords, maxDistance = 10000

export const searchResult = async (req, reply) => {
  try {
    const client = new MongoClient(process.env.MONGOURI);
    await client.connect();
    const database = client.db("snuger");
    const usersCollection = database.collection("users");
    const postsCollection = database.collection("posts");

    const { searchQuery, userCoords, maxDistance = 10000 } = req.body;
    console.log(userCoords);
    const results = {
      user_search: [],
      snugs_text_result: [],
      snugs_vector_result: [],
      nearby_posts: [],
    };

    // User Full-Text Search Pipeline with Location
    const userSearchPipeline = [
      {
        $search: {
          index: "users_index",
          compound: {
            should: [
              {
                autocomplete: {
                  query: searchQuery,
                  path: "username",
                  tokenOrder: "sequential",
                  fuzzy: { maxEdits: 2 },
                },
              },
              {
                text: {
                  query: searchQuery,
                  path: "name",
                  fuzzy: { maxEdits: 2 },
                },
              },
            ],
          },
        },
      },
      {
        $match: {
          location: {
            $geoWithin: {
              $centerSphere: [
                [userCoords.longitude, userCoords.latitude],
                maxDistance / 6378100, // Convert meters to radians (radius of Earth is 6378100 meters)
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          username: 1,
          profileImage: 1,
          snugScore: 1,
          location: 1,
          score: { $meta: "searchScore" },
        },
      },
      { $sort: { score: -1 } },
      { $limit: 5 },
    ];

    const geoSearchResult = usersCollection.aggregate(userSearchPipeline);
    for await (const doc of geoSearchResult) {
      results["user_search"].push(doc);
    }

    // Posts text search pipeline with location
    const postSearchPipeline = [
      {
        $search: {
          index: "posts_text_index",
          text: {
            query: searchQuery,
            path: ["content", "title"],
            fuzzy: { maxEdits: 2 },
          },
        },
      },
      {
        $match: {
          location: {
            $geoWithin: {
              $centerSphere: [
                [userCoords.longitude, userCoords.latitude],
                maxDistance / 6378100,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          location: 1,
          score: { $meta: "searchScore" },
        },
      },
      { $sort: { score: -1 } },
      { $limit: 10 },
    ];

    const textSearchResults = await postsCollection
      .aggregate(postSearchPipeline)
      .toArray();
    results["snugs_text_result"] = textSearchResults;

    // Vector search pipeline with location
    const queryEmbedding = await getEmbedding(searchQuery);
    const vectorSearchPipeline = [
      {
        $vectorSearch: {
          index: "posts_vector_index",
          queryVector: queryEmbedding,
          path: "embedding",
          exact: false,
          limit: 20,
          numCandidates: 20,
          similarityThreshold: 1,
        },
      },
      {
        $match: {
          location: {
            $geoWithin: {
              $centerSphere: [
                [userCoords.longitude, userCoords.latitude],
                maxDistance / 6378100,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          snugScore: 1,
          location: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
      { $limit: 10 },
    ];

    const snugSearchResult = postsCollection.aggregate(vectorSearchPipeline);
    for await (const doc of snugSearchResult) {
      results["snugs_vector_result"].push(doc);
    }

    // Nearby posts without text search
    const nearbyPostsPipeline = [
      {
        $match: {
          location: {
            $geoWithin: {
              $centerSphere: [
                [userCoords.longitude, userCoords.latitude],
                maxDistance / 6378100,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          location: 1,
        },
      },
      { $limit: 10 },
    ];

    const nearbyPosts = await postsCollection
      .aggregate(nearbyPostsPipeline)
      .toArray();
    results["nearby_posts"] = nearbyPosts;

    return reply.status(200).send(results);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  } finally {
    await client.close();
  }
}

// const searchQuery = "@muskanriya";
// const userLocation = {
//   latitude: 24.269154189825926,
//   longitude: 87.25044466349696,
// };
// const results = await run(searchQuery, userLocation, 5000); // 5km radius
