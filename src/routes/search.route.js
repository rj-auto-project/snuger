import { searchResult } from "../controllers/search.controller.js";

export const searchRoutes = async (fastify) => {
  //  search near-by
  fastify.post("/nearme", searchResult);
};
