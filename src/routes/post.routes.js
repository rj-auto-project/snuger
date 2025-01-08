import fastifyMultipart from "@fastify/multipart";
import { createPost, getPosts } from "../controllers/post.controller.js";

export const postRoutes = async (fastify) => {
  // Register the fastify-multipart plugin for handling file uploads
  fastify.register(fastifyMultipart, {
    addToBody: true, // Adds parsed files to the request body
    limits: {
      fileSize: 50 * 1024 * 1024, // Set a file size limit (e.g., 50MB)
    },
  });
  fastify.post("/upload", createPost);
  fastify.get("/", getPosts);
};
