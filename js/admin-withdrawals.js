import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const list =
  document.getElementById("withdrawalsList");

const searchInput =
  document.getElementById("searchInput");

const statusFilter =
  document.getElementById("statusFilter");


let adminReady = false;
let allWithdrawals = [];


// ==========================================
// CHECK ADMIN
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

      window.location.replace(
        "dashboard.html"
      );

      return;
    }


    const adminData =
      adminSnap.data();


    if (adminData.role !== "admin") {

      alert("Access denied.");

      window.location.replace(
        "dashboard.html"
      );

      return;
    }


    adminReady = true;

    loadWithdrawals();

  } catch (error) {

    console.error(
      "ADMIN CHECK ERROR:",
      error
    );

    list.innerHTML =
      `<p>❌ ${error.message}</p>`;

  }

});


// ==========================================
// LOAD WITHDRAWALS
// ==========================================

async function loadWithdrawals() {

  if (!list) return;


  list.innerHTML =
    "<p>⏳ Loading withdrawals...</p>";


  try {

    const q =
      query(
        collection(
          db,
          "withdrawals"
        ),
        where(
          "status",
          "==",
          "pending"
        )
      );


    const snap =
      await getDocs(q);


    allWithdrawals = [];


    snap.forEach((item) => {

      allWithdrawals.push({
        id: item.id,
        data: item.data()
      });

    });


    renderWithdrawals();

  } catch (error) {

    console.error(
      "LOAD WITHDRAWALS ERROR:",
      error
    );


    list.innerHTML =
      `<p>❌ ${error.message}</p>`;

  }

}


// ==========================================
// RENDER
// ==========================================

function renderWithdrawals() {

  if (!list) return;


  list.innerHTML = "";


  const search =
    (searchInput?.value || "")
      .trim()
      .toLowerCase();


  const selectedStatus =
    statusFilter?.value || "pending";


  const filtered =
    allWithdrawals.filter((item) => {

      const d = item.data;


      const userId =
        String(
          d.uid ||
          d.userId ||
          ""
        ).toLowerCase();


      const matchesSearch =
        !search ||
        userId.includes(search);


      const matchesStatus =
        String(
          d.status || "pending"
        ).toLowerCase() ===
        selectedStatus;


      return (
        matchesSearch &&
        matchesStatus
      );

    });


  if (filtered.length === 0) {

    list.innerHTML =
      "<p>✅ No pending withdrawals.</p>";

    return;
  }


  filtered.forEach((item) => {

    const d =
      item.data;


    const amount =
      Number(
        d.amount || 0
      );


    const userId =
      d.uid ||
      d.userId ||
      "-";


    const card =
      document.createElement("div");


    card.className =
      "card";


    card.innerHTML = `

      <h3>💸 Withdrawal Request</h3>

      <p>
        <b>User ID:</b>
        ${userId}
      </p>

      <p>
        <b>Amount:</b>
        ${amount.toFixed(2)} ETB
      </p>

      <p>
        <b>Method:</b>
        ${d.method || "-"}
      </p>

      <p>
        <b>Account:</b>
        ${d.account || "-"}
      </p>

      <p>
        <b>Status:</b>
        <strong>
          ${d.status || "pending"}
        </strong>
      </p>

      <div class="buttons">

        <button
          type="button"
          class="approve"
          data-id="${item.id}"
        >
          ✅ Approve
        </button>

        <button
          type="button"
          class="reject"
          data-id="${item.id}"
        >
          ❌ Reject / Refund
        </button>

      </div>

    `;


    list.appendChild(card);

  });


  // ========================================
  // APPROVE BUTTON
  // ========================================

  list
    .querySelectorAll(".approve")
    .forEach((btn) => {

      btn.addEventListener(
        "click",
        async () => {

          await processWithdrawal(
            btn.dataset.id,
            true
          );

        }
      );

    });


  // ========================================
  // REJECT BUTTON
  // ========================================

  list
    .querySelectorAll(".reject")
    .forEach((btn) => {

      btn.addEventListener(
        "click",
        async () => {

          await processWithdrawal(
            btn.dataset.id,
            false
          );

        }
      );

    });

}


// ==========================================
// SEARCH
// ==========================================

if (searchInput) {

  searchInput.addEventListener(
    "input",
    renderWithdrawals
  );

}


// ==========================================
// STATUS FILTER
// ==========================================

if (statusFilter) {

  statusFilter.addEventListener(
    "change",
    renderWithdrawals
  );

}


// ==========================================
// APPROVE / REJECT
// ==========================================

async function processWithdrawal(
  withdrawalId,
  approve
) {

  if (!adminReady) {

    alert(
      "❌ Admin verification is not ready."
    );

    return;
  }


  try {

    const withdrawalRef =
      doc(
        db,
        "withdrawals",
        withdrawalId
      );


    const withdrawalSnap =
      await getDoc(
        withdrawalRef
      );


    if (!withdrawalSnap.exists()) {

      throw new Error(
        "Withdrawal request not found."
      );

    }


    const withdrawal =
      withdrawalSnap.data();


    if (
      withdrawal.status !==
      "pending"
    ) {

      throw new Error(
        "This withdrawal has already been processed."
      );

    }


    const userId =
      withdrawal.uid ||
      withdrawal.userId;


    if (!userId) {

      throw new Error(
        "Withdrawal user ID is missing."
      );

    }


    const amount =
      Number(
        withdrawal.amount || 0
      );


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      throw new Error(
        "Invalid withdrawal amount."
      );

    }


    // ======================================
    // APPROVE
    // ======================================

    if (approve) {

      const transactionId =
        prompt(
          "Enter the payment Transaction ID:"
        );


      if (
        !transactionId ||
        !transactionId.trim()
      ) {

        alert(
          "❌ Payment Transaction ID is required."
        );

        return;
      }


      await runTransaction(
        db,
        async (tx) => {

          const freshSnap =
            await tx.get(
              withdrawalRef
            );


          if (!freshSnap.exists()) {

            throw new Error(
              "Withdrawal not found."
            );

          }


          const freshData =
            freshSnap.data();


          if (
            freshData.status !==
            "pending"
          ) {

            throw new Error(
              "Withdrawal already processed."
            );

          }


          tx.update(
            withdrawalRef,
            {

              status:
                "approved",

              paymentTransactionId:
                transactionId.trim(),

              processedAt:
                serverTimestamp()

            }
          );

        }
      );


      // ==================================
      // TRANSACTION HISTORY
      // ==================================

      await addDoc(
        collection(
          db,
          "transactions"
        ),
        {

          uid:
            userId,

          userId:
            userId,

          type:
            "Withdrawal Approved",

          amount:
            -amount,

          status:
            "Completed",

          paymentTransactionId:
            transactionId.trim(),

          description:
            "Withdrawal approved and payment completed by admin",

          createdAt:
            serverTimestamp()

        }
      );


      alert(
        "✅ Withdrawal approved successfully.\n\nPayment Transaction ID:\n" +
        transactionId.trim()
      );


      loadWithdrawals();

      return;
    }


    // ======================================
    // REJECT + REFUND
    // ======================================

    const confirmReject =
      confirm(
        "Are you sure you want to reject this withdrawal and refund the user?"
      );


    if (!confirmReject) {

      return;
    }


    const userRef =
      doc(
        db,
        "users",
        userId
      );


    await runTransaction(
      db,
      async (tx) => {

        const freshWithdrawal =
          await tx.get(
            withdrawalRef
          );


        if (
          !freshWithdrawal.exists()
        ) {

          throw new Error(
            "Withdrawal not found."
          );

        }


        const freshData =
          freshWithdrawal.data();


        if (
          freshData.status !==
          "pending"
        ) {

          throw new Error(
            "Withdrawal already processed."
          );

        }


        const userSnap =
          await tx.get(
            userRef
          );


        if (
          !userSnap.exists()
        ) {

          throw new Error(
            "User profile not found."
          );

        }


        const userData =
          userSnap.data();


        const oldBalance =
          Number(
            userData.balance || 0
          );


        const newBalance =
          oldBalance + amount;


        tx.update(
          userRef,
          {

            balance:
              newBalance

          }
        );


        tx.update(
          withdrawalRef,
          {

            status:
              "rejected",

            refundedAmount:
              amount,

            processedAt:
              serverTimestamp()

          }
        );

      }
    );


    // ======================================
    // REFUND TRANSACTION
    // ======================================

    await addDoc(
      collection(
        db,
        "transactions"
      ),
      {

        uid:
          userId,

        userId:
          userId,

        type:
          "Withdrawal Refunded",

        amount:
          amount,

        status:
          "Refunded",

        description:
          "Withdrawal rejected and amount refunded by admin",

        createdAt:
          serverTimestamp()

      }
    );


    alert(
      "✅ Withdrawal rejected and refunded successfully."
    );


    loadWithdrawals();


  } catch (error) {

    console.error(
      "PROCESS WITHDRAWAL ERROR:",
      error
    );


    console.error(
      "ERROR CODE:",
      error.code
    );


    console.error(
      "ERROR MESSAGE:",
      error.message
    );


    alert(
      "❌ " +
      (
        error.message ||
        "Withdrawal processing failed."
      )
    );

  }

}