export const userSearchPipeline = [
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
