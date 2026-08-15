import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const usersList = document.getElementById("usersList");
const searchInput = document.getElementById("searchInput");
let users = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  const adminSnap = await getDoc(doc(db, "users", user.uid));

  if (!adminSnap.exists() || adminSnap.data().role !== "admin") {
    alert("Access denied.");
    window.location.replace("dashboard.html");
    return;
  }

  loadUsers();
});

async function loadUsers() {
  usersList.innerHTML = "<p>Loading...</p>";

  try {
    const snap = await getDocs(collection(db, "users"));

    users = snap.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    displayUsers(users);
  } catch (error) {
    console.error(error);
    usersList.innerHTML = `<p>❌ ${error.message}</p>`;
  }
}

function displayUsers(list) {
  usersList.innerHTML = "";

  if (!list.length) {
    usersList.innerHTML = "<p>No users found.</p>";
    return;
  }

  list.forEach((user) => {
    const card = document.createElement("div");
    card.className = "card";

    const created =
      user.createdAt?.toDate?.()
        ? user.createdAt.toDate().toLocaleString()
        : "-";

    card.innerHTML = `
      <h3>${user.name || "-"}</h3>
      <p><b>Email:</b> ${user.email || "-"}</p>
      <p><b>Balance:</b> ${Number(user.balance || 0).toFixed(2)} ETB</p>
      <p><b>Role:</b> ${user.role || "user"}</p>
      <p><b>Created:</b> ${created}</p>
      <button class="delete" data-id="${user.id}">Delete Profile</button>
    `;

    card.querySelector(".delete").addEventListener("click", async () => {
      if (!confirm("Delete this user's Firestore profile?")) return;

      try {
        await deleteDoc(doc(db, "users", user.id));
        alert("User profile deleted. Firebase Authentication account is not deleted by this web page.");
        loadUsers();
      } catch (error) {
        console.error(error);
        alert("❌ " + error.message);
      }
    });

    usersList.appendChild(card);
  });
}

searchInput.addEventListener("input", () => {
  const text = searchInput.value.trim().toLowerCase();

  displayUsers(
    users.filter((user) =>
      (user.name || "").toLowerCase().includes(text) ||
      (user.email || "").toLowerCase().includes(text)
    )
  );
});
