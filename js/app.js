import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const usernameEl = document.getElementById("username");
const balanceEl = document.getElementById("balance");
const referralCountEl = document.getElementById("referralCount");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (!userSnap.exists()) {
      alert("Your user profile was not found.");
      await signOut(auth);
      window.location.replace("login.html");
      return;
    }

    const data = userSnap.data();

    if (usernameEl) usernameEl.textContent = data.name || user.email;
    if (balanceEl) {
      balanceEl.textContent =
        Number(data.balance || 0).toFixed(2) + " ETB";
    }

    const q = query(
      collection(db, "users"),
      where("referredBy", "==", user.uid)
    );
    const referralSnap = await getDocs(q);

    if (referralCountEl) {
      referralCountEl.textContent = referralSnap.size + " Friends";
    }
  } catch (error) {
    console.error("Dashboard error:", error);
    alert("Unable to load your dashboard: " + error.message);
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    await signOut(auth);
    window.location.replace("login.html");
  });
}
