import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAJQVPzoVRQGk2l9-LD04wJyoP8qfG1yJQ",
  authDomain: "inventorypro-9f5cb.firebaseapp.com",
  projectId: "inventorypro-9f5cb",
  storageBucket: "inventorypro-9f5cb.firebasestorage.app",
  messagingSenderId: "926195937184",
  appId: "1:926195937184:web:81f0f4d7bb42fdea1c7ec5",
  measurementId: "G-M8E2TQ9B1E",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
