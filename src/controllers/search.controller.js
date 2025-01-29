import mongoose from "mongoose";
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
    const session = await mongoose.startSession();
    session.startTransaction();
    const usersCollection = mongoose.connection.db.collection("users");
    const postsCollection = mongoose.connection.db.collection("posts");

    const {
      currentUserId,
      searchQuery,
      userCoords,
      maxDistance = 10000,
    } = req.body;
    const results = {
      user_search: [],
      snugs_text_result: [],
      snugs_vector_result: [],
      // nearby_posts: [],
    };
    const currentUser = await usersCollection.findOne(
      { _id: new mongoose.Types.ObjectId(currentUserId) },
      { projection: { groupIDs: 1 } }
    );
    console.log("test");
    // User Full-Text Search Pipeline with Location and Common Groups
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
                maxDistance / 6378100, // Convert meters to radians
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
          groupIDs: 1,
          score: { $meta: "searchScore" },
          commonGroupIds: {
            $setIntersection: ["$groupIDs", currentUser.groupIDs || []],
          },
          commonGroupsCount: {
            $size: {
              $setIntersection: ["$groupIDs", currentUser.groupIDs || []],
            },
          },
        },
      },
      {
        $lookup: {
          from: "groups",
          let: { commonIds: "$commonGroupIds" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: [{ $toString: "$_id" }, "$$commonIds"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
              },
            },
          ],
          as: "commonGroups",
        },
      },
      {
        $addFields: {
          // Optionally boost score based on number of common groups
          adjustedScore: {
            $add: [
              { $meta: "searchScore" },
              { $multiply: ["$commonGroupsCount", 0.1] }, // Adjust multiplier as needed
            ],
          },
        },
      },
      { $sort: { adjustedScore: -1 } },
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
        $lookup: {
          from: "groups",
          localField: "groupID",
          foreignField: "_id",
          as: "group",
        },
      },
      {
        $addFields: {
          group: { $arrayElemAt: ["$group", 0] },
          isInCommonGroup: {
            $cond: {
              if: {
                $in: [
                  "$groupID",
                  currentUser.groupIDs.map(
                    (id) => new mongoose.Types.ObjectId(id)
                  ),
                ],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "author",
        },
      },
      {
        $addFields: {
          author: { $arrayElemAt: ["$author", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          location: 1,
          totalVotes: 1,
          totalComment: 1,
          createdAt: 1,
          isAnonymous: 1,
          score: { $meta: "searchScore" },
          group: {
            $cond: {
              if: "$isInCommonGroup",
              then: {
                _id: "$group._id",
                name: "$group.name",
              },
              else: null,
            },
          },
          author: {
            $cond: {
              if: "$isAnonymous",
              then: null,
              else: {
                _id: "$author._id",
                username: "$author.username",
                name: "$author.name",
                profileImage: "$author.profileImage",
              },
            },
          },
          isInCommonGroup: 1,
        },
      },
      {
        $addFields: {
          adjustedScore: {
            $add: [
              { $meta: "searchScore" },
              { $cond: { if: "$isInCommonGroup", then: 0.2, else: 0 } },
            ],
          },
        },
      },
      { $sort: { adjustedScore: -1 } },
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
        $lookup: {
          from: "groups",
          localField: "groupID",
          foreignField: "_id",
          as: "group",
        },
      },
      {
        $addFields: {
          group: { $arrayElemAt: ["$group", 0] },
          isInCommonGroup: {
            $cond: {
              if: {
                $in: [
                  "$groupID",
                  currentUser.groupIDs.map(
                    (id) => new mongoose.Types.ObjectId(id)
                  ),
                ],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "author",
        },
      },
      {
        $addFields: {
          author: { $arrayElemAt: ["$author", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          location: 1,
          totalVotes: 1,
          totalComment: 1,
          createdAt: 1,
          isAnonymous: 1,
          score: { $meta: "vectorSearchScore" },
          group: {
            $cond: {
              if: "$isInCommonGroup",
              then: {
                _id: "$group._id",
                name: "$group.name",
              },
              else: null,
            },
          },
          author: {
            $cond: {
              if: "$isAnonymous",
              then: null,
              else: {
                _id: "$author._id",
                username: "$author.username",
                name: "$author.name",
                profileImage: "$author.profileImage",
              },
            },
          },
          isInCommonGroup: 1,
        },
      },
      {
        $addFields: {
          adjustedScore: {
            $add: [
              { $meta: "vectorSearchScore" },
              { $cond: { if: "$isInCommonGroup", then: 0.2, else: 0 } },
            ],
          },
        },
      },
      { $sort: { adjustedScore: -1 } },
      { $limit: 10 },
    ];

    const snugSearchResult = postsCollection.aggregate(vectorSearchPipeline);
    for await (const doc of snugSearchResult) {
      results["snugs_vector_result"].push(doc);
    }

    return reply.status(200).send(results);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  } finally {
    await client.close();
  }
};
