import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ==========================================
// CHECK SCRIPT LOADED
// ==========================================

console.log("admin-login.js loaded");


// ==========================================
// GET HTML ELEMENTS
// ==========================================

const form = document.getElementById("adminLoginForm");
const message = document.getElementById("message");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");


// ==========================================
// CHECK ELEMENTS
// ==========================================

if (!form) {
  
  alert("❌ Admin Login Form not found!");
  
  console.error("adminLoginForm was not found.");
  
} else {
  
  console.log("✅ Admin Login Form found.");
  
}


// ==========================================
// ADMIN LOGIN
// ==========================================

if (form) {
  
  form.addEventListener("submit", async (e) => {
    
    e.preventDefault();
    
    console.log("Login button clicked.");
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    
    // ==========================================
    // EMPTY INPUT CHECK
    // ==========================================
    
    if (!email) {
      
      message.textContent = "❌ Enter admin email.";
      
      return;
      
    }
    
    
    if (!password) {
      
      message.textContent = "❌ Enter password.";
      
      return;
      
    }
    
    
    message.textContent = "⏳ Logging in...";
    
    
    try {
      
      // ==========================================
      // FIREBASE AUTH LOGIN
      // ==========================================
      
      console.log("Trying Firebase login...");
      
      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      
      
      const user = userCredential.user;
      
      console.log(
        "✅ Firebase login successful:",
        user.uid
      );
      
      
      // ==========================================
      // GET USER DOCUMENT
      // ==========================================
      
      message.textContent =
        "⏳ Checking admin permission...";
      
      
      const userRef =
        doc(db, "users", user.uid);
      
      
      const userSnap =
        await getDoc(userRef);
      
      
      // ==========================================
      // USER DOCUMENT NOT FOUND
      // ==========================================
      
      if (!userSnap.exists()) {
        
        await signOut(auth);
        
        message.textContent =
          "❌ User profile not found.";
        
        return;
        
      }
      
      
      // ==========================================
      // GET USER DATA
      // ==========================================
      
      const userData = userSnap.data();
      
      console.log("User data:", userData);
      
      
      // ==========================================
      // CHECK ADMIN ROLE
      // ==========================================
      
      if (userData.role !== "admin") {
        
        await signOut(auth);
        
        message.textContent =
          "❌ You are not authorized as an admin.";
        
        return;
        
      }
      
      
      // ==========================================
      // ADMIN LOGIN SUCCESS
      // ==========================================
      
      message.textContent =
        "✅ Admin login successful!";
      
      
      console.log("✅ ADMIN LOGIN SUCCESS");
      
      
      // ==========================================
      // GO TO ADMIN DASHBOARD
      // ==========================================
      
      setTimeout(() => {
        
        window.location.href =
          "admin-dashboard.html";
        
      }, 1000);
      
      
    } catch (error) {
      
      console.error(
        "ADMIN LOGIN ERROR:",
        error
      );
      
      
      // ==========================================
      // FIREBASE ERROR MESSAGES
      // ==========================================
      
      if (
        error.code ===
        "auth/invalid-credential"
      ) {
        
        message.textContent =
          "❌ Email or password is incorrect.";
        
      }
      
      else if (
        error.code ===
        "auth/user-not-found"
      ) {
        
        message.textContent =
          "❌ Admin account not found.";
        
      }
      
      else if (
        error.code ===
        "auth/wrong-password"
      ) {
        
        message.textContent =
          "❌ Wrong password.";
        
      }
      
      else if (
        error.code ===
        "auth/invalid-email"
      ) {
        
        message.textContent =
          "❌ Invalid email address.";
        
      }
      
      else {
        
        message.textContent =
          "❌ Login failed: " +
          error.message;
        
      }
      
    }
    
  });
  
}