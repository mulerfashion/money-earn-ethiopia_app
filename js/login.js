import { auth } from "./firebase.js";

import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");

if (!emailInput || !passwordInput || !loginBtn) {
  throw new Error("Login form elements are missing.");
}

async function login() {
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Please enter your email and password.");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Login successful!");
    window.location.replace("dashboard.html");
  } catch (error) {
    console.error("Login error:", error);

    const messages = {
      "auth/invalid-credential": "Email or password is incorrect.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/user-not-found": "This account does not exist.",
      "auth/wrong-password": "Wrong password.",
      "auth/too-many-requests": "Too many attempts. Please try again later."
    };

    alert(messages[error.code] || "Login failed: " + error.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
}

loginBtn.addEventListener("click", login);

[emailInput, passwordInput].forEach((input) => {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") login();
  });
});
