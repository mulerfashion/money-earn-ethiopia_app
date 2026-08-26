import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const addTaskBtn = document.getElementById("addTaskBtn");
const message = document.getElementById("message");
let adminReady = false;

addTaskBtn.disabled = true;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  try {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists() || snap.data().role !== "admin") {
      alert("Access denied.");
      window.location.replace("dashboard.html");
      return;
    }

    adminReady = true;
    addTaskBtn.disabled = false;
  } catch (error) {
    console.error(error);
    message.textContent = "❌ " + error.message;
  }
});

addTaskBtn.addEventListener("click", async () => {
  if (!adminReady) return;

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const reward = Number(document.getElementById("reward").value);

  if (!title || !Number.isFinite(reward) || reward <= 0) {
    message.textContent = "❌ Enter a title and a valid reward.";
    return;
  }

  addTaskBtn.disabled = true;

  try {
    await addDoc(collection(db, "tasks"), {
      title,
      description,
      reward,
      createdAt: serverTimestamp()
    });

    message.textContent = "✅ Task created successfully.";
    document.getElementById("title").value = "";
    document.getElementById("description").value = "";
    document.getElementById("reward").value = "";
  } catch (error) {
    console.error(error);
    message.textContent = "❌ " + error.message;
  } finally {
    addTaskBtn.disabled = false;
  }
});
