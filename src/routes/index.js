import userRoutes from "./user.routes.js";

export const routes = (storage, bucketName) => (fastify, options, done) => {
  fastify.register(userRoutes(storage, bucketName), { prefix: "/user" });
  done();
};
