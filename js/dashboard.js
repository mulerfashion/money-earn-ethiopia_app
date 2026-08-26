import { db, auth } from "./firebase.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


const username =
  document.getElementById("username");

const balance =
  document.getElementById("balance");

const logoutBtn =
  document.getElementById("logoutBtn");


onAuthStateChanged(auth, async (user) => {
  
  // ==========================================
  // CHECK LOGIN
  // ==========================================
  
  if (!user) {
    
    window.location.href =
      "login.html";
    
    return;
  }
  
  
  try {
    
    // ==========================================
    // GET USER DOCUMENT
    // ==========================================
    
    const userRef =
      doc(
        db,
        "users",
        user.uid
      );
    
    
    const userSnap =
      await getDoc(userRef);
    
    
    if (!userSnap.exists()) {
      
      username.textContent =
        user.email || "User";
      
      balance.textContent =
        "0.00 ETB";
      
      return;
    }
    
    
    const userData =
      userSnap.data();
    
    
    // ==========================================
    // USERNAME
    // ==========================================
    
    username.textContent =
      userData.name ||
      user.email ||
      "User";
    
    
    // ==========================================
    // BALANCE
    // ==========================================
    
    const currentBalance =
      Number(
        userData.balance ?? 0
      );
    
    
    balance.textContent =
      currentBalance.toFixed(2) +
      " ETB";
    
    
  } catch (error) {
    
    console.error(
      "Dashboard error:",
      error
    );
    
    balance.textContent =
      "0.00 ETB";
  }
  
});


// ==========================================
// LOGOUT
// ==========================================

logoutBtn.addEventListener(
  "click",
  async (event) => {
    
    event.preventDefault();
    
    try {
      
      await signOut(auth);
      
      window.location.href =
        "login.html";
      
    } catch (error) {
      
      console.error(
        "Logout error:",
        error
      );
      
    }
    
  }
);