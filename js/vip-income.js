import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const claimBtn = document.getElementById("claimIncomeBtn");
const message = document.getElementById("message");

let currentUser = null;

// Check Login
onAuthStateChanged(auth, (user) => {
  
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  
  currentUser = user;
  
});

// Claim VIP Income
if (claimBtn) {
  
  claimBtn.addEventListener("click", async () => {
    
    if (!currentUser) {
      message.textContent = "❌ Please login first.";
      return;
    }
    
    try {
      
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        message.textContent = "❌ User not found.";
        return;
      }
      
      const data = userSnap.data();
      
      if (!data.vip || !data.vip.active) {
        message.textContent = "❌ No active VIP plan.";
        return;
      }
      
      const now = Date.now();
      const lastClaim = data.vip.lastClaim?.toMillis?.() || 0;
      
      if (now - lastClaim < 24 * 60 * 60 * 1000) {
        message.textContent =
          "⏳ You can claim only once every 24 hours.";
        return;
      }
      
      const income = Number(data.vip.dailyIncome || 0);
      const balance = Number(data.balance || 0);
      
      await updateDoc(userRef, {
        balance: balance + income,
        "vip.lastClaim": serverTimestamp()
      });
      
      await addDoc(
        collection(db, "transactions"),
        {
          userId: currentUser.uid,
          type: "VIP Daily Income",
          amount: income,
          createdAt: serverTimestamp()
        }
      );
      
      message.textContent =
        "✅ " + income + " ETB added to your balance.";
      
    } catch (error) {
      
      console.error(error);
      
      message.textContent =
        "❌ " + error.message;
      
    }
    
  });
  
}