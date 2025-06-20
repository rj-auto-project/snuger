// index.js
import './src/workers/trendingWorker.js'
import fastify from "fastify";
import { connectDB } from "./src/config/connect.js";
import env from "./src/config/env.js";
import rateLimitPlugin from "./src/plugin/ratelimiter.js";
import fastifyCors from "@fastify/cors";
import { errorHandler } from "./src/utils/error.js";
import { registerRoutes } from "./src/routes/index.js";
import fastifyIO from 'fastify-socket.io';

const app = fastify();

// Register plugins
app.register(rateLimitPlugin);
app.register(fastifyCors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
});

// Set error handler
app.setErrorHandler(errorHandler);

// Register routes
app.register(registerRoutes);

// Root route
app.get("/", async (request, reply) => {
  return { message: "Hello from Snuger 😎" };
});

app.register(fastifyIO, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  // adapter: createAdapter(redisClient, redisClient.duplicate())
});

// Add health check route
app.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Start server
const start = async () => {
  try {
    await connectDB(env.MONGO_URI);

    app.listen({ port: env.PORT ?? 8080, host: "0.0.0.0" }, (err, addr) => {
      if (err) {
        console.error(err);
        process.exit(1);
      } else {
        console.log(`Server is running at ${addr}`);
      }
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();