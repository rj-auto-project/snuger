import fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { connectDB } from "./src/config/connect.js";
import env from "./src/config/env.js";
import rateLimitPlugin from "./src/plugin/ratelimiter.js";
import fastifyCors from "@fastify/cors";
import { errorHandler } from "./src/utils/error.js";
import { registerRoutes } from "./src/routes/index.js";

const app = fastify();

app.register(fastifyWebsocket);

app.register(rateLimitPlugin);
app.register(fastifyCors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
});

app.setErrorHandler(errorHandler);

app.register(registerRoutes);
app.register(chatRoutes);

app.get("/", async (request, reply) => {
  return { message: "Hello from Snuger 😎" };
});

const start = async () => {
  try {
    await connectDB(env.MONGO_URI);

    app.listen({ port: env.PORT, host: "0.0.0.0" }, (err, addr) => {
      if (err) {
        console.error(err);
      } else {
        console.log(`Server is running at http://localhost:${env.PORT}`);
      }
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
