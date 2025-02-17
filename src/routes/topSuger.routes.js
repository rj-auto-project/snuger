import { getTopSnuger } from "../controllers/topSnugers.controller.js";

export const getTopSnugerRoutes = async function (fastify) {
  fastify.post("/", getTopSnuger);
};