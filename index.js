import fastify from "fastify";
import { connectDB } from "./src/config/connect.js";
import env from "./src/config/env.js";
import rateLimitPlugin from "./src/plugin/ratelimiter.js";
import fastifyCors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket"; // WebSocket plugin
import { errorHandler } from "./src/utils/error.js";
import { registerRoutes } from "./src/routes/index.js";

const app = fastify();

// Register plugins
app.register(rateLimitPlugin);
app.register(fastifyCors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
});
app.register(websocketPlugin); // Register WebSocket plugin

// Set error handler
app.setErrorHandler(errorHandler);

// Register HTTP routes
app.register(registerRoutes);

// Root route
app.get("/", async (request, reply) => {
  return { message: "Hello from Snuger 😎" };
});

// Start server
const start = async () => {
  try {
    await connectDB(env.MONGO_URI); // Connect to MongoDB

    app.listen({ port: env.PORT, host: "0.0.0.0" }, (err, addr) => {
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
