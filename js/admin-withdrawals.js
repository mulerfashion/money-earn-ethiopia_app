import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
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

    list.innerHTML =
      "<p>⏳ Checking admin account...</p>";


    const adminRef =
      doc(
        db,
        "users",
        user.uid
      );


    const adminSnap =
      await getDoc(adminRef);


    if (!adminSnap.exists()) {

      list.innerHTML =
        "<p>❌ Admin profile not found.</p>";

      return;
    }


    const adminData =
      adminSnap.data();


    if (adminData.role !== "admin") {

      list.innerHTML =
        "<p>❌ Access denied. Admin account required.</p>";

      return;
    }


    adminReady = true;


    await loadWithdrawals();

  } catch (error) {

    console.error(
      "ADMIN CHECK ERROR:",
      error
    );

    console.error(
      "CODE:",
      error.code
    );

    console.error(
      "MESSAGE:",
      error.message
    );


    list.innerHTML =
      "<p>❌ Admin check failed: " +
      (
        error.message ||
        "Unknown error"
      ) +
      "</p>";

  }

});


// ==========================================
// LOAD ALL WITHDRAWALS
// ==========================================

async function loadWithdrawals() {

  list.innerHTML =
    "<p>⏳ Loading withdrawals...</p>";


  try {

    /*
      IMPORTANT:
      We are NOT using where() here.

      This avoids query/index problems
      and lets us filter locally.
    */

    const snapshot =
      await getDocs(
        collection(
          db,
          "withdrawals"
        )
      );


    allWithdrawals = [];


    snapshot.forEach((item) => {

      allWithdrawals.push({

        id:
          item.id,

        data:
          item.data()

      });

    });


    console.log(
      "Withdrawals found:",
      allWithdrawals.length
    );


    renderWithdrawals();


  } catch (error) {

    console.error(
      "LOAD WITHDRAWALS ERROR:",
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


    list.innerHTML =
      "<p>❌ Failed to load withdrawals.</p>" +

      "<p><b>Error:</b> " +
      (
        error.message ||
        "Unknown error"
      ) +
      "</p>" +

      "<p><b>Code:</b> " +
      (
        error.code ||
        "-"
      ) +
      "</p>";

  }

}


// ==========================================
// RENDER WITHDRAWALS
// ==========================================

function renderWithdrawals() {

  if (!list) {
    return;
  }


  list.innerHTML = "";


  const search =
    (
      searchInput?.value ||
      ""
    )
    .trim()
    .toLowerCase();


  const selectedStatus =
    (
      statusFilter?.value ||
      "pending"
    )
    .toLowerCase();


  const filtered =
    allWithdrawals.filter(
      (item) => {

        const d =
          item.data;


        const status =
          String(
            d.status ||
            "pending"
          )
          .toLowerCase();


        const userId =
          String(
            d.uid ||
            d.userId ||
            ""
          )
          .toLowerCase();


        const account =
          String(
            d.account ||
            ""
          )
          .toLowerCase();


        const matchesSearch =
          !search ||
          userId.includes(search) ||
          account.includes(search);


        const matchesStatus =
          status ===
          selectedStatus;


        return (
          matchesSearch &&
          matchesStatus
        );

      }
    );


  // ========================================
  // NO RESULTS
  // ========================================

  if (
    filtered.length ===
    0
  ) {

    list.innerHTML =
      "<p>✅ No " +
      selectedStatus +
      " withdrawals found.</p>";

    return;
  }


  // ========================================
  // DISPLAY
  // ========================================

  filtered.forEach(
    (item) => {

      const d =
        item.data;


      const amount =
        Number(
          d.amount ||
          0
        );


      const userId =
        d.uid ||
        d.userId ||
        "-";


      const status =
        d.status ||
        "pending";


      const card =
        document.createElement(
          "div"
        );


      card.className =
        "card";


      card.innerHTML = `

        <h3>
          💸 Withdrawal Request
        </h3>

        <p>
          <b>User ID:</b>
          ${userId}
        </p>

        <p>
          <b>Amount:</b>
          ${amount.toFixed(2)}
          ETB
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
            ${status}
          </strong>
        </p>

        ${
          d.paymentTransactionId
          ?
          `
          <p>
            <b>Payment Transaction ID:</b>
            ${d.paymentTransactionId}
          </p>
          `
          :
          ""
        }

        ${
          status === "pending"
          ?
          `
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
          `
          :
          ""
        }

      `;


      list.appendChild(
        card
      );

    }
  );


  // ========================================
  // APPROVE BUTTONS
  // ========================================

  list
    .querySelectorAll(
      ".approve"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          async () => {

            await processWithdrawal(
              button.dataset.id,
              true
            );

          }
        );

      }
    );


  // ========================================
  // REJECT BUTTONS
  // ========================================

  list
    .querySelectorAll(
      ".reject"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          async () => {

            await processWithdrawal(
              button.dataset.id,
              false
            );

          }
        );

      }
    );

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
// PROCESS WITHDRAWAL
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
        withdrawal.amount ||
        0
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


          if (
            !freshSnap.exists()
          ) {

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
      // SAVE HISTORY
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

          withdrawalId:
            withdrawalId,

          description:
            "Withdrawal approved and payment completed by admin",

          createdAt:
            serverTimestamp()

        }
      );


      alert(
        "✅ Withdrawal approved successfully."
      );


      await loadWithdrawals();

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
            userData.balance ||
            0
          );


        const newBalance =
          oldBalance +
          amount;


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
    // REFUND HISTORY
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

        withdrawalId:
          withdrawalId,

        description:
          "Withdrawal rejected and amount refunded by admin",

        createdAt:
          serverTimestamp()

      }
    );


    alert(
      "✅ Withdrawal rejected and refunded successfully."
    );


    await loadWithdrawals();


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