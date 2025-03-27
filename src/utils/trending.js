import { Post } from "../model/post.model.js";
import mongoose from "mongoose";

// Constants
const MAX_DISTANCE_METERS = 5000;
const TOP_POSTS_LIMIT = 20;
const GRID_SIZE_DEGREES = 0.05; // Approximately 5km at the equator
const BATCH_SIZE = 100;
const RECENT_ACTIVITY_WINDOW_MINUTES = 30;

/**
 * Calculates trending positions for posts based on geographic proximity and votes
 */
export const updateTrendingPositions = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find areas with recent activity to prioritize processing
    const recentActivityAreas = await findAreasWithRecentActivity();

    // Process areas with recent activity
    if (recentActivityAreas.length > 0) {
      await processAreas(recentActivityAreas);
    }
    
    // Process remaining areas with existing trending posts that need refreshing
    const existingTrendingAreas = await findAreasWithExistingTrendingPosts(recentActivityAreas);
    
    if (existingTrendingAreas.length > 0) {
      await processAreas(existingTrendingAreas);
    }
    
    await session.commitTransaction();
    
    return {
      success: true,
      areasProcessed: recentActivityAreas.length + existingTrendingAreas.length
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Find geographic areas with recent post activity
 */
const findAreasWithRecentActivity = async () => {
  const recentActivityWindow = new Date(Date.now() - RECENT_ACTIVITY_WINDOW_MINUTES * 60 * 1000);
  
  try {
    // Find posts with recent activity, using an indexed query
    const recentPosts = await Post.find({
      $or: [
        { createdAt: { $gte: recentActivityWindow } },
        { updatedAt: { $gte: recentActivityWindow } }
      ],
      location: { $exists: true }
    }, { "location.coordinates": 1 }).lean();
    
    // Group posts by grid cell to avoid redundant processing
    const gridCells = {};
    
    recentPosts.forEach(post => {
      if (!post.location?.coordinates || post.location.coordinates.length !== 2) return;
      
      const [lng, lat] = post.location.coordinates;
      const cellX = Math.floor(lng / GRID_SIZE_DEGREES);
      const cellY = Math.floor(lat / GRID_SIZE_DEGREES);
      const cellKey = `${cellX}:${cellY}`;
      
      if (!gridCells[cellKey]) {
        gridCells[cellKey] = {
          coordinates: [
            cellX * GRID_SIZE_DEGREES + GRID_SIZE_DEGREES/2,
            cellY * GRID_SIZE_DEGREES + GRID_SIZE_DEGREES/2
          ]
        };
      }
    });
    
    return Object.values(gridCells);
  } catch (error) {
    throw error;
  }
};

/**
 * Find areas with existing trending posts that need refreshing
 * @param {Array} excludeAreas - Areas to exclude from processing
 */
const findAreasWithExistingTrendingPosts = async (excludeAreas) => {
  try {
    // Use the new isTrending field for more efficient querying
    const existingTrendingPosts = await Post.find(
      { isTrending: true },
      { "location.coordinates": 1 }
    ).lean();
    
    // Create a set of areas to exclude
    const excludeKeys = new Set();
    excludeAreas.forEach(area => {
      const cellX = Math.floor(area.coordinates[0] / GRID_SIZE_DEGREES);
      const cellY = Math.floor(area.coordinates[1] / GRID_SIZE_DEGREES);
      excludeKeys.add(`${cellX}:${cellY}`);
    });
    
    // Group by grid cell
    const gridCells = {};
    
    existingTrendingPosts.forEach(post => {
      if (!post.location?.coordinates || post.location.coordinates.length !== 2) return;
      
      const [lng, lat] = post.location.coordinates;
      const cellX = Math.floor(lng / GRID_SIZE_DEGREES);
      const cellY = Math.floor(lat / GRID_SIZE_DEGREES);
      const cellKey = `${cellX}:${cellY}`;
      
      // Skip areas we've already processed
      if (excludeKeys.has(cellKey)) {
        return;
      }
      
      if (!gridCells[cellKey]) {
        gridCells[cellKey] = {
          coordinates: [
            cellX * GRID_SIZE_DEGREES + GRID_SIZE_DEGREES/2,
            cellY * GRID_SIZE_DEGREES + GRID_SIZE_DEGREES/2
          ]
        };
      }
    });
    
    return Object.values(gridCells);
  } catch (error) {
    throw error;
  }
};

/**
 * Process geographic areas in batches
 * @param {Array} areas - Areas to process
 */
const processAreas = async (areas) => {
  // Process areas in batches to avoid memory issues
  for (let i = 0; i < areas.length; i += BATCH_SIZE) {
    const batchAreas = areas.slice(i, i + BATCH_SIZE);
    const batchUpdates = [];
    const processedIds = new Set(); // Track processed post IDs
    
    for (const area of batchAreas) {
      try {
        // Use more efficient aggregation to find top posts in this area
        const topPosts = await Post.aggregate([
          {
            $geoNear: {
              near: { type: "Point", coordinates: area.coordinates },
              distanceField: "distance",
              maxDistance: MAX_DISTANCE_METERS,
              spherical: true,
              query: { location: { $exists: true } }
            }
          },
          // Score posts by recency and votes
          {
            $addFields: {
              score: {
                $add: [
                  "$totalVotes",
                  {
                    $multiply: [
                      10,
                      {
                        $divide: [
                          { $subtract: [new Date(), "$createdAt"] },
                          1000 * 60 * 60 * 24 // Decay factor over 24 hours
                        ]
                      }
                    ]
                  }
                ]
              }
            }
          },
          { $sort: { score: -1 } },
          { $limit: TOP_POSTS_LIMIT },
          { $project: { _id: 1 } }
        ]);
        
        // Get post IDs in this area that are currently marked as trending
        const areaPostIds = await Post.find({
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: area.coordinates
              },
              $maxDistance: MAX_DISTANCE_METERS
            }
          },
          isTrending: true
        }, { _id: 1 }).lean();
        
        // Track post IDs in this area
        const areaIds = new Set(areaPostIds.map(p => p._id.toString()));
        const topPostIds = new Set(topPosts.map(p => p._id.toString()));
        
        // Update trending positions for top posts
        topPosts.forEach((post, index) => {
          const postId = post._id.toString();
          if (!processedIds.has(postId)) {
            batchUpdates.push({
              updateOne: {
                filter: { _id: post._id },
                update: { 
                  $set: { 
                    trendingPosition: index + 1,
                    isTrending: true,
                    trendingUpdatedAt: new Date()
                  } 
                }
              }
            });
            processedIds.add(postId);
          }
        });
        
        // Reset trending status for posts no longer in top list
        const postsToReset = [...areaIds].filter(id => !topPostIds.has(id));
        if (postsToReset.length > 0) {
          batchUpdates.push({
            updateMany: {
              filter: {
                _id: { $in: postsToReset.map(id => mongoose.Types.ObjectId(id)) },
                isTrending: true
              },
              update: { 
                $unset: { trendingPosition: "" },
                $set: { 
                  isTrending: false,
                  trendingUpdatedAt: new Date() 
                }
              }
            }
          });
        }
      } catch (error) {
        // Log error but continue processing other areas
        throw error;
      }
    }
    
    // Execute batch updates if any
    if (batchUpdates.length > 0) {
      try {
        await Post.bulkWrite(batchUpdates, { ordered: false });
      } catch (error) {
        throw error;
      }
    }
  }
};

/**
 * Function to create indexes required for efficient geo queries
 * Run this during application startup
 */
export const ensureTrendingIndexes = async () => {
  try {
    // Ensure 2dsphere index on location
    await Post.collection.createIndex({ "location": "2dsphere" });
    
    // Compound index for efficient trending lookups
    await Post.collection.createIndex({ 
      "isTrending": 1,
      "trendingPosition": 1
    });
    
    // Combined index for time-based trending queries
    await Post.collection.createIndex({ 
      "isTrending": 1,
      "createdAt": 1
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Handle the cleanup of trending positions for deleted posts
 * @param {Array} postIds - Array of post IDs that were deleted
 */
export const handlePostDeletion = async (postIds) => {
  try {
    // Convert string IDs to ObjectIDs if needed
    const objectIds = postIds.map(id => 
      typeof id === 'string' ? mongoose.Types.ObjectId(id) : id
    );
    
    // Find posts to update (posts that had these deleted posts in their trending calculations)
    const affectedAreas = await Post.find(
      { _id: { $in: objectIds }, location: { $exists: true } },
      { "location.coordinates": 1 }
    ).lean();
    
    // Create a set of areas to refresh
    const areasToRefresh = [];
    affectedAreas.forEach(post => {
      if (post.location && post.location.coordinates) {
        areasToRefresh.push({
          coordinates: post.location.coordinates
        });
      }
    });
    
    // Process affected areas to update trending positions
    if (areasToRefresh.length > 0) {
      await processAreas(areasToRefresh);
    }
  } catch (error) {
    throw error;
  }
};

