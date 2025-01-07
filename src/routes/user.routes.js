import userController from "../controllers/user.controller.js";
import multipart from "@fastify/multipart";

export default (storage, bucketName) => (fastify, options, done) => {
  const controller = userController(storage, bucketName);

  fastify.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });

  fastify.post("/add", controller.addUser);

  done();
};
