import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const balanceEl = document.getElementById("balance");
const referralEarnEl = document.getElementById("referralEarn");
const withdrawTotalEl = document.getElementById("withdrawTotal");

onAuthStateChanged(auth, async (user) => {
  
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  
  try {
    
    // Balance
    let balance = 0;
    
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      balance = Number(userSnap.data().balance || 0);
    }
    
    balanceEl.textContent = balance.toFixed(2) + " ETB";
    
    // Referral Earnings
    const referralSnap = await getDocs(
      query(
        collection(db, "users"),
        where("referredBy", "==", user.uid)
      )
    );
    
    const referralMoney = referralSnap.size * 50;
    
    referralEarnEl.textContent =
      referralMoney.toFixed(2) + " ETB";
    
    // Withdrawals
    const withdrawalSnap = await getDocs(
      query(
        collection(db, "withdrawals"),
        where("userId", "==", user.uid)
      )
    );
    
    let totalWithdraw = 0;
    
    withdrawalSnap.forEach((doc) => {
      const data = doc.data();
      
      if (data.status === "Approved") {
        totalWithdraw += Number(data.amount || 0);
      }
    });
    
    withdrawTotalEl.textContent =
      totalWithdraw.toFixed(2) + " ETB";
    
  } catch (error) {
    
    console.error(error);
    
    balanceEl.textContent = "0.00 ETB";
    referralEarnEl.textContent = "0.00 ETB";
    withdrawTotalEl.textContent = "0.00 ETB";
    
  }
  
});