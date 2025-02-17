import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

admin.initializeApp({
  credential: admin.credential.cert(path.resolve(__dirname, "firebase.json")),
});

export const auth = admin.auth();
export const messaging = admin.messaging();

console.log("Firebase Admin SDK initialized successfully.");
