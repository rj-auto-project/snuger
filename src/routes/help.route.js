// src/routes/report.routes.js
import { submitHelp } from "../controllers/help.controller";

export const helpRoutes = (fastify, opts, done) => {
  fastify.post('/', submitHelp);  // Make sure the POST route is defined like this
  done();
};
