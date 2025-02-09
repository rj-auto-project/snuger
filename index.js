// index.js
import fastify from "fastify";
import { connectDB } from "./src/config/connect.js";
import env from "./src/config/env.js";
import rateLimitPlugin from "./src/plugin/ratelimiter.js";
import fastifyCors from "@fastify/cors";
import { errorHandler } from "./src/utils/error.js";
import { registerRoutes } from "./src/routes/index.js";
import fastifySocketIO from "fastify-socket.io";
import { handleSocketEvents } from "./src/config/socketHandler.js";

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

//register websockets
app.register(fastifySocketIO, {
  cors: {
    origin: "*",
  },
  transports: ["websocket"],
  pingInterval: 10000,
  pingTimeout: 5000,
});

app.ready().then(() => {
  console.log("Socket.io server ready!");
  app.io.on("connection", (socket) => handleSocketEvents(socket, app.io));
});

// Start server
const start = async () => {
  try {
    await connectDB(env.MONGO_URI);

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
