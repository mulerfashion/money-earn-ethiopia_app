import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAz6aW8bUxobp_0NqzqRJgIpBx9rQyWv5k",
  authDomain: "money-earn-ethiopia.firebaseapp.com",
  projectId: "money-earn-ethiopia",
  storageBucket: "money-earn-ethiopia.firebasestorage.app",
  messagingSenderId: "793359983873",
  appId: "1:793359983873:web:4a4f8cf3bbc783d4846700",
  measurementId: "G-7T5BB7M9Z1"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };