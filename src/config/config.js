import { fastifySession } from "@fastify/session";
import ConnectMongoDBSession from "connect-mongodb-session";
import "dotenv/config";
import env from "./env";

const MongodbStore = ConnectMongoDBSession(fastifySession);

export const sessionStore = new MongodbStore({
  uri: env.MONGO_URI,
  collection: "sessions",
});

sessionStore.on("error", (error) => {
  console.log("session store error: ", error);
});