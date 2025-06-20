import admin from "firebase-admin";

const firebase= process.env.FIREBASE_SERVICE_ACCOUNT;
const firebaseJson= JSON.parse(firebase)
admin.initializeApp({
  credential: admin.credential.cert(firebaseJson),
});

export const auth = admin.auth();
export const messaging = admin.messaging();

console.log("Firebase Admin SDK initialized successfully.");
