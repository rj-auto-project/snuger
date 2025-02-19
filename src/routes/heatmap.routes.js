import { getHeatmapData, getBatchHeatmapData } from "../controllers/heatmap.controller.js";

export const heatmapRoutes = async (fastify, options) => {
  // Get heatmap data for a single point
  fastify.get("/", {
    schema: {
      querystring: {
        type: "object",
        required: ["latitude", "longitude"],
        properties: {
          latitude: { type: "string" },
          longitude: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                count: { type: "number" },
                coordinates: {
                  type: "object",
                  properties: {
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                  },
                },
                radius: { type: "number" },
                radiusInKm: { type: "number" },
              },
            },
          },
        },
      },
    },
    handler: getHeatmapData,
  });

  // Get heatmap data for multiple points
  fastify.post("/batch", {
    schema: {
      body: {
        type: "object",
        required: ["points"],
        properties: {
          points: {
            type: "array",
            items: {
              type: "object",
              required: ["latitude", "longitude"],
              properties: {
                latitude: { type: "string" },
                longitude: { type: "string" },
              },
            },
          },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  coordinates: {
                    type: "object",
                    properties: {
                      latitude: { type: "string" },
                      longitude: { type: "string" },
                    },
                  },
                  count: { type: "number" },
                  radius: { type: "number" },
                  radiusInKm: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    handler: getBatchHeatmapData,
  });
};