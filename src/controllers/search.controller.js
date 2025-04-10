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
    };

    let currentUser = null;
    if (currentUserId) {
      currentUser = await usersCollection.findOne(
        { _id: new mongoose.Types.ObjectId(currentUserId) },
        { projection: { groupIDs: 1 } }
      );
    }

    // Only perform user search if query starts with @
    if (searchQuery.startsWith("@")) {
      try {
        const userQuery = searchQuery.substring(1); // Remove @ symbol
        const userSearchPipeline = [
          {
            $search: {
              index: "users_index",
              compound: {
                should: [
                  {
                    autocomplete: {
                      query: userQuery,
                      path: "username",
                      tokenOrder: "sequential",
                      fuzzy: { maxEdits: 2 },
                    },
                  },
                  {
                    text: {
                      query: userQuery,
                      path: "name",
                      fuzzy: { maxEdits: 2 },
                    },
                  },
                ],
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
                $cond: {
                  if: {
                    $and: [
                      { $isArray: "$groupIDs" },
                      { $ne: [currentUser, null] },
                      { $ne: [{ $ifNull: [currentUser?.groupIDs, null] }, null] },
                    ],
                  },
                  then: {
                    $setIntersection: ["$groupIDs", currentUser?.groupIDs || []],
                  },
                  else: [],
                },
              },
              commonGroupsCount: {
                $cond: {
                  if: {
                    $and: [
                      { $isArray: "$groupIDs" },
                      { $ne: [currentUser, null] },
                      { $ne: [{ $ifNull: [currentUser?.groupIDs, null] }, null] },
                    ],
                  },
                  then: {
                    $size: {
                      $setIntersection: ["$groupIDs", currentUser?.groupIDs || []],
                    },
                  },
                  else: 0,
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
      } catch (error) {
        console.log(error);
      }
    } else {
      // Only perform post searches if query doesn't start with @
      // Posts text search pipeline
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
                  $and: [
                    { $ne: [currentUser, null] },
                    { $ne: [{ $ifNull: [currentUser?.groupIDs, null] }, null] },
                    {
                      $in: [
                        "$groupID",
                        currentUser?.groupIDs
                          ? currentUser.groupIDs.map(
                              (id) => new mongoose.Types.ObjectId(id)
                            )
                          : [],
                      ],
                    },
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
            as: "user",
          },
        },
        {
          $addFields: {
            user: { $arrayElemAt: ["$user", 0] },
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
            images:1,
            videos:1,
            audios:1,
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
            user: {
              $cond: {
                if: "$isAnonymous",
                then: null,
                else: {
                  _id: "$user._id",
                  username: "$user.username",
                  name: "$user.name",
                  profileImage: "$user.profileImage",
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
      
      // Store text results temporarily
      const textResults = new Map(textSearchResults.map(post => [post._id.toString(), post]));

      // Vector search pipeline
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
                  $and: [
                    { $ne: [currentUser, null] },
                    { $ne: [{ $ifNull: [currentUser?.groupIDs, null] }, null] },
                    {
                      $in: [
                        "$groupID",
                        currentUser?.groupIDs
                          ? currentUser.groupIDs.map(
                              (id) => new mongoose.Types.ObjectId(id)
                            )
                          : [],
                      ],
                    },
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
            as: "user",
          },
        },
        {
          $addFields: {
            user: { $arrayElemAt: ["$user", 0] },
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
            images:1,
            videos:1,
            audios:1,
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
            user: {
              $cond: {
                if: "$isAnonymous",
                then: null,
                else: {
                  _id: "$user._id",
                  username: "$user.username",
                  name: "$user.name",
                  profileImage: "$user.profileImage",
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
        const docId = doc._id.toString();
        if (textResults.has(docId)) {
          // If post exists in both searches, keep the one with higher score
          const textResult = textResults.get(docId);
          if (doc.adjustedScore > textResult.adjustedScore) {
            textResults.set(docId, doc);
          }
        } else {
          textResults.set(docId, doc);
        }
      }

      // Convert merged results back to array and sort by score
      const mergedResults = Array.from(textResults.values())
        .sort((a, b) => b.adjustedScore - a.adjustedScore)
        .slice(0, 15); // Limit total results to 15

      results["snugs_results"] = mergedResults;
      delete results["snugs_vector_result"]; // No longer needed since results are merged
      delete results["snugs_text_result"]; // No longer needed since results are merged
    }

    return reply.status(200).send(results);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  } finally {
    await client.close();
  }
};
