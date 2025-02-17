// src/routes/report.routes.js
import { submitHelp } from "../controllers/help.controller.js";
import fastifyMultipart from "@fastify/multipart";

export const helpRoutes = (fastify, opts, done) => {
  fastify.register(fastifyMultipart, {
    addToBody: true,
    limits: {
      fileSize: 50 * 1024 * 1024, // size limit 50MB
    },
  });
  fastify.post("/", submitHelp); // Make sure the POST route is defined like this
  done();
};
