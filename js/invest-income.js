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
  serverTimestamp,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const claimBtn = document.getElementById("claimInvestBtn");
const message = document.getElementById("message");

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  
  currentUser = user;
  
});

if (claimBtn) {
  
  claimBtn.addEventListener("click", async () => {
    
    if (!currentUser) {
      message.textContent = "❌ Please login first.";
      return;
    }
    
    try {
      
      const q = query(
        collection(db, "investments"),
        where("userId", "==", currentUser.uid),
        where("status", "==", "Active")
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        message.textContent = "❌ No active investment.";
        return;
      }
      
      const investDoc = snapshot.docs[0];
      const investData = investDoc.data();
      
      const now = Date.now();
      const lastClaim =
        investData.lastClaim?.toMillis?.() || 0;
      
      if (now - lastClaim < 24 * 60 * 60 * 1000) {
        
        message.textContent =
          "⏳ You can claim once every 24 hours.";
        
        return;
      }
      
      const income =
        Number(investData.dailyReturn || 0);
      
      const userRef =
        doc(db, "users", currentUser.uid);
      
      const userSnap =
        await getDoc(userRef);
      
      const userData =
        userSnap.data();
      
      const balance =
        Number(userData.balance || 0);
      
      await updateDoc(userRef, {
        
        balance: balance + income
        
      });
      
      await updateDoc(investDoc.ref, {
        
        lastClaim: serverTimestamp()
        
      });
      
      await addDoc(
        collection(db, "transactions"),
        {
          
          userId: currentUser.uid,
          
          type: "Investment Income",
          
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