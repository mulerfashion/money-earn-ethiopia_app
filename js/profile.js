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

const nameEl = document.getElementById("name");
const emailEl = document.getElementById("email");
const balanceEl = document.getElementById("balance");
const vipEl = document.getElementById("vip");
const referralsEl = document.getElementById("referrals");
const refreshBtn = document.getElementById("refreshBtn");

async function loadProfile(user) {
  
  try {
    
    const userSnap = await getDoc(doc(db, "users", user.uid));
    
    if (!userSnap.exists()) {
      nameEl.textContent = "-";
      emailEl.textContent = user.email;
      balanceEl.textContent = "0 ETB";
      vipEl.textContent = "No VIP";
      referralsEl.textContent = "0";
      return;
    }
    
    const data = userSnap.data();
    
    nameEl.textContent = data.name || "-";
    emailEl.textContent = data.email || user.email;
    balanceEl.textContent = Number(data.balance || 0).toFixed(2) + " ETB";
    
    if (data.vip?.active) {
      vipEl.textContent = "VIP " + (data.vip.level || 1);
    } else {
      vipEl.textContent = "No VIP";
    }
    
    const referralSnap = await getDocs(
      query(
        collection(db, "users"),
        where("referredBy", "==", user.uid)
      )
    );
    
    referralsEl.textContent = referralSnap.size;
    
  } catch (error) {
    
    console.error(error);
    alert(error.message);
    
  }
  
}

onAuthStateChanged(auth, (user) => {
  
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  
  loadProfile(user);
  
  refreshBtn.onclick = () => loadProfile(user);
  
});