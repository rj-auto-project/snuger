import fastifyRateLimit from "@fastify/rate-limit";


const rateLimitPlugin = async (fastify) => {
  fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });
};

export default rateLimitPlugin;
