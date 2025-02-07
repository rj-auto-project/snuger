import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAb_ZSPUOEQyGSI4YWjSX1P3hWX6YlkG7E",
  authDomain: "snuger-74ceb.firebaseapp.com",
  projectId: "snuger-74ceb",
  storageBucket: "snuger-74ceb.firebasestorage.app",
  messagingSenderId: "304827199993",
  appId: "1:304827199993:web:db1f3032f3424c08214d28",
  measurementId: "G-VQN00VD0SN",
};

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

console.log("Firebase Admin SDK initialized successfully.");
