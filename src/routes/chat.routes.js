import multipart from "@fastify/multipart";

export const chatRoutes = async (fastify, options) => {
  fastify.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });
  fastify.get("/", (req, reply) => {
    reply.sendFile("index.html");
  });
  fastify.get('/ws', { websocket: true }, handleWebSocket);
};
