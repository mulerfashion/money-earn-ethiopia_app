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


// ==========================================
// ADMIN AUTH CHECK
// ==========================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location.replace("login.html");

    return;
  }


  try {

    const adminRef =
      doc(db, "users", user.uid);

    const adminSnap =
      await getDoc(adminRef);


    if (!adminSnap.exists()) {

      alert("Admin profile not found.");

      window.location.replace("dashboard.html");

      return;
    }


    const adminData =
      adminSnap.data();


    if (adminData.role !== "admin") {

      alert("Access denied.");

      window.location.replace("dashboard.html");

      return;
    }


    // Admin confirmed
    await loadDashboard();


  } catch (error) {

    console.error(
      "Admin dashboard error:",
      error
    );

    alert(
      "❌ Failed to load admin dashboard:\n" +
      error.message
    );

  }

});


// ==========================================
// COUNT BY STATUS
// ==========================================

async function countByStatus(
  collectionName,
  status
) {

  const q =
    query(
      collection(
        db,
        collectionName
      ),
      where(
        "status",
        "==",
        status
      )
    );


  const snap =
    await getDocs(q);


  return snap.size;

}


// ==========================================
// LOAD DASHBOARD STATISTICS
// ==========================================

async function loadDashboard() {

  try {

    // --------------------------------------
    // GET COLLECTIONS
    // --------------------------------------

    const usersSnap =
      await getDocs(
        collection(db, "users")
      );


    const depositsSnap =
      await getDocs(
        collection(db, "deposits")
      );


    const withdrawalsSnap =
      await getDocs(
        collection(db, "withdrawals")
      );


    const tasksSnap =
      await getDocs(
        collection(db, "tasks")
      );


    // --------------------------------------
    // TOTAL BALANCE
    // --------------------------------------

    let totalBalance = 0;


    usersSnap.forEach((item) => {

      const data =
        item.data();


      totalBalance +=
        Number(
          data.balance || 0
        );

    });


    // --------------------------------------
    // PENDING COUNTS
    // --------------------------------------

    const pendingDeposits =
      await countByStatus(
        "deposits",
        "pending"
      );


    const pendingWithdrawals =
      await countByStatus(
        "withdrawals",
        "pending"
      );


    // --------------------------------------
    // DISPLAY STATISTICS
    // --------------------------------------

    const totalUsers =
      document.getElementById(
        "totalUsers"
      );


    const totalDeposits =
      document.getElementById(
        "totalDeposits"
      );


    const pendingDepositsElement =
      document.getElementById(
        "pendingDeposits"
      );


    const totalWithdrawals =
      document.getElementById(
        "totalWithdrawals"
      );


    const pendingWithdrawalsElement =
      document.getElementById(
        "pendingWithdrawals"
      );


    const totalTasks =
      document.getElementById(
        "totalTasks"
      );


    const totalBalanceElement =
      document.getElementById(
        "totalBalance"
      );


    if (totalUsers) {

      totalUsers.textContent =
        usersSnap.size;

    }


    if (totalDeposits) {

      totalDeposits.textContent =
        depositsSnap.size;

    }


    if (pendingDepositsElement) {

      pendingDepositsElement.textContent =
        pendingDeposits;

    }


    if (totalWithdrawals) {

      totalWithdrawals.textContent =
        withdrawalsSnap.size;

    }


    if (pendingWithdrawalsElement) {

      pendingWithdrawalsElement.textContent =
        pendingWithdrawals;

    }


    if (totalTasks) {

      totalTasks.textContent =
        tasksSnap.size;

    }


    if (totalBalanceElement) {

      totalBalanceElement.textContent =
        totalBalance.toFixed(2) +
        " ETB";

    }


  } catch (error) {

    console.error(
      "Load dashboard error:",
      error
    );

    throw error;

  }

}


// ==========================================
// LOGOUT
// ==========================================

const logoutBtn =
  document.getElementById(
    "logoutBtn"
  );


if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      try {

        await signOut(auth);

        window.location.replace(
          "login.html"
        );

      } catch (error) {

        console.error(
          "Logout error:",
          error
        );

        alert(
          "❌ Logout failed: " +
          error.message
        );

      }

    }
  );

}