// index.js
import './src/workers/trendingWorker.js'
import fastify from "fastify";
import { connectDB } from "./src/config/connect.js";
import env from "./src/config/env.js";
import rateLimitPlugin from "./src/plugin/ratelimiter.js";
import fastifyCors from "@fastify/cors";
import { errorHandler } from "./src/utils/error.js";
import { registerRoutes } from "./src/routes/index.js";
import Redis from 'ioredis';
import fastifyIO from 'fastify-socket.io';
import { randomBytes } from 'crypto';
import { createAdapter } from '@socket.io/redis-adapter';
import { HybridMessageStore } from './src/service/message.service.js';
import { RedisSessionStore } from './src/service/sessionStore.service.js';

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

// Redis client  '127.0.0.1',//   10.113.121.147
const redisClient = new Redis({
  host:  "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    app.log.error('Redis reconnection error:', err);
    return true;
  }
});

// Redis event handlers
redisClient.on('error', (err) => {
  console.log('Redis Client Error:-', err);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

redisClient.on('ready', () => {
  console.log('Redis Client Ready');
});

app.register(fastifyIO, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  adapter: createAdapter(redisClient, redisClient.duplicate())
});

// Add health check route
app.get('/health', async (request, reply) => {
  return { status: 'ok' };
});


const randomId = () => randomBytes(8).toString('hex');

const sessionStore = new RedisSessionStore(redisClient);

const messageStore = new HybridMessageStore(redisClient);

app.ready(err => {
  if (err) throw err;

  const authenticateSocket = async (socket, next) => {
    try {
      const sessionID = socket.handshake.auth && socket.handshake.auth.sessionID;
      if (sessionID) {
        const session = await sessionStore.findSession(sessionID);
        if (session) {
          socket.sessionID = sessionID;
          socket.userID = session.userID;
          socket.username = session.username;
          return next();
        }
      }
      const username = socket.handshake.auth && socket.handshake.auth.username;
      const userID = socket.handshake.auth && socket.handshake.auth.userID;
      if (!username) {
        return next(new Error('invalid username'));
      }

      // random userID
      socket.sessionID = userID;
      socket.userID = userID
      socket.username = username;
      next();
    } catch (error) {
      next(error);
    }
  };

  app.io.use(authenticateSocket);

  app.io.on('connection', async (socket) => {
    // persist session
    sessionStore.saveSession(socket.sessionID, {
      userID: socket.userID,
      username: socket.username,
      connected: true,
    });

    // emit session details
    socket.emit('session', {
      sessionID: socket.sessionID,
      userID: socket.userID,
    });

    // join the "userID" room
    socket.join(socket.userID);

    // fetch existing users and messages
    const users = [];
    const [messages, sessions] = await Promise.all([
      messageStore.findMessagesForUser(socket.userID),
      sessionStore.findAllSessions(),
    ]);
    const messagesPerUser = new Map();
    messages.forEach((message) => {
      const { from, to } = message;
      const otherUser = socket.userID === from ? to : from;
      if (messagesPerUser.has(otherUser)) {
        messagesPerUser.get(otherUser).push(message);
      } else {
        messagesPerUser.set(otherUser, [message]);
      }
    });

    sessions.forEach((session) => {
      users.push({
        userID: session.userID,
        username: session.username,
        connected: session.connected,
        messages: messagesPerUser.get(session.userID) || [],
      });
    });
    socket.emit('users', users);

    // notify existing users
    socket.broadcast.emit('user connected', {
      userID: socket.userID,
      username: socket.username,
      connected: true,
      messages: [],
    });

    // forward the private message to the right recipient (and to other tabs of the sender)
    socket.on('private message', async ({ content, to }) => {
      const message = {
        content,
        from: socket.userID,
        to,
      };
      console.log('Message:', message);
      socket.to(to).to(socket.userID).emit('private message', message);
      try {
        await messageStore.saveMessage(message);
      } catch (error) {
        app.log.error('Error saving message:', error);
        socket.emit('message error', { error: 'Failed to save message' });
      }
    });

    // notify users upon disconnection
    socket.on('disconnect', async () => {
      const matchingSockets = await app.io.in(socket.userID).allSockets();
      const isDisconnected = matchingSockets.size === 0;
      if (isDisconnected) {
        // notify other users
        socket.broadcast.emit('user disconnected', socket.userID);
        // update the connection status of the session
        sessionStore.saveSession(socket.sessionID, {
          userID: socket.userID,
          username: socket.username,
          connected: false,
        });
      }
    });
  });
});

// Graceful shutdown
const cleanup = async () => {
  try {
    await redisClient.quit();
    await app.close();
    process.exit(0);
  } catch (err) {
    app.log.error('Shutdown error:', err);
    process.exit(1);
  }
};

// Handle process signals
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);





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