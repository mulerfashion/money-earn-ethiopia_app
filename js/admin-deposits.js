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
  document.getElementById("depositList");

let adminReady = false;


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

    await loadDeposits();


  } catch (error) {

    console.error(
      "Admin check error:",
      error
    );


    alert(
      "❌ " +
      (
        error.message ||
        "Admin verification failed."
      )
    );

  }

});


// ==========================================
// LOAD PENDING DEPOSITS
// ==========================================

async function loadDeposits() {

  if (!list) return;


  list.innerHTML =
    "<p style='text-align:center;'>⏳ Loading deposits...</p>";


  try {

    const depositsRef =
      collection(
        db,
        "deposits"
      );


    // ======================================
    // GET "pending"
    // ======================================

    const pendingQuery =
      query(
        depositsRef,
        where(
          "status",
          "==",
          "pending"
        )
      );


    // ======================================
    // GET "Pending"
    // ======================================

    const PendingQuery =
      query(
        depositsRef,
        where(
          "status",
          "==",
          "Pending"
        )
      );


    const [
      pendingSnap,
      PendingSnap
    ] = await Promise.all([

      getDocs(
        pendingQuery
      ),

      getDocs(
        PendingQuery
      )

    ]);


    // ======================================
    // COMBINE RESULTS
    // ======================================

    const depositDocs = [];


    pendingSnap.forEach(
      (item) => {

        depositDocs.push(
          item
        );

      }
    );


    PendingSnap.forEach(
      (item) => {

        // Prevent duplicate documents
        const alreadyExists =
          depositDocs.some(
            (existing) =>
              existing.id === item.id
          );


        if (!alreadyExists) {

          depositDocs.push(
            item
          );

        }

      }
    );


    // ======================================
    // NO PENDING DEPOSITS
    // ======================================

    if (
      depositDocs.length === 0
    ) {

      list.innerHTML =
        `
        <p style="text-align:center;">
          ✅ No pending deposits.
        </p>
        `;

      return;
    }


    // ======================================
    // CLEAR LIST
    // ======================================

    list.innerHTML = "";


    // ======================================
    // DISPLAY DEPOSITS
    // ======================================

    depositDocs.forEach(
      (item) => {

        const d =
          item.data();


        const amount =
          Number(
            d.amount || 0
          );


        const userId =
          d.uid ||
          d.userId ||
          "-";


        const card =
          document.createElement(
            "div"
          );


        card.className =
          "deposit-card";


        card.innerHTML = `

          <h3>
            💳 Deposit Request
          </h3>

          <p>
            <b>User ID:</b>
            ${userId}
          </p>

          <p>
            <b>Phone:</b>
            ${d.phone || d.account || "-"}
          </p>

          <p>
            <b>Transaction ID:</b>
            ${d.transactionId || "-"}
          </p>

          <p>
            <b>Method:</b>
            ${d.method || "Telebirr"}
          </p>

          <p>
            <b>Amount:</b>
            ${amount.toFixed(2)} ETB
          </p>

          <p>
            <b>Status:</b>
            ${d.status || "pending"}
          </p>

          <div class="buttons">

            <button
              type="button"
              class="approve-btn"
              data-id="${item.id}"
            >
              ✅ Approve
            </button>

            <button
              type="button"
              class="reject-btn"
              data-id="${item.id}"
            >
              ❌ Reject
            </button>

          </div>

        `;


        list.appendChild(
          card
        );

      }
    );


    // ======================================
    // APPROVE BUTTONS
    // ======================================

    list
      .querySelectorAll(
        ".approve-btn"
      )
      .forEach(
        (btn) => {

          btn.addEventListener(
            "click",
            async () => {

              const confirmed =
                confirm(
                  "Are you sure you want to approve this deposit?"
                );


              if (!confirmed) {

                return;
              }


              btn.disabled =
                true;


              btn.textContent =
                "⏳ Processing...";


              await processDeposit(
                btn.dataset.id,
                true
              );

            }
          );

        }
      );


    // ======================================
    // REJECT BUTTONS
    // ======================================

    list
      .querySelectorAll(
        ".reject-btn"
      )
      .forEach(
        (btn) => {

          btn.addEventListener(
            "click",
            async () => {

              const confirmed =
                confirm(
                  "Are you sure you want to reject this deposit?"
                );


              if (!confirmed) {

                return;
              }


              btn.disabled =
                true;


              btn.textContent =
                "⏳ Processing...";


              await processDeposit(
                btn.dataset.id,
                false
              );

            }
          );

        }
      );


  } catch (error) {

    console.error(
      "Load deposits error:",
      error
    );


    list.innerHTML =
      `
      <p style="color:red;">
        ❌ ${
          error.message ||
          "Failed to load deposits."
        }
      </p>
      `;

  }

}


// ==========================================
// APPROVE / REJECT DEPOSIT
// ==========================================

async function processDeposit(
  depositId,
  approve
) {

  if (!adminReady) {

    alert(
      "Admin verification is not ready."
    );

    return;
  }


  try {

    const depositRef =
      doc(
        db,
        "deposits",
        depositId
      );


    // ======================================
    // GET DEPOSIT
    // ======================================

    const depositSnap =
      await getDoc(
        depositRef
      );


    if (!depositSnap.exists()) {

      throw new Error(
        "Deposit request not found."
      );

    }


    const deposit =
      depositSnap.data();


    // ======================================
    // ACCEPT BOTH pending AND Pending
    // ======================================

    const currentStatus =
      String(
        deposit.status || ""
      ).toLowerCase();


    if (
      currentStatus !==
      "pending"
    ) {

      throw new Error(
        "This deposit has already been processed."
      );

    }


    const userId =
      deposit.uid ||
      deposit.userId;


    if (!userId) {

      throw new Error(
        "Deposit user ID is missing."
      );

    }


    const amount =
      Number(
        deposit.amount || 0
      );


    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {

      throw new Error(
        "Invalid deposit amount."
      );

    }


    if (
      approve &&
      amount < 100
    ) {

      throw new Error(
        "Minimum deposit is 100 ETB."
      );

    }


    const userRef =
      doc(
        db,
        "users",
        userId
      );


    let oldBalance =
      0;

    let newBalance =
      0;


    // ======================================
    // FIRESTORE TRANSACTION
    // ======================================

    await runTransaction(
      db,
      async (tx) => {

        // ----------------------------------
        // FRESH DEPOSIT
        // ----------------------------------

        const freshDeposit =
          await tx.get(
            depositRef
          );


        if (
          !freshDeposit.exists()
        ) {

          throw new Error(
            "Deposit not found."
          );

        }


        const freshData =
          freshDeposit.data();


        const freshStatus =
          String(
            freshData.status || ""
          ).toLowerCase();


        // ----------------------------------
        // PREVENT DOUBLE PROCESSING
        // ----------------------------------

        if (
          freshStatus !==
          "pending"
        ) {

          throw new Error(
            "This deposit has already been processed."
          );

        }


        // ==================================
        // REJECT
        // ==================================

        if (!approve) {

          tx.update(
            depositRef,
            {

              status:
                "rejected",

              processedAt:
                serverTimestamp(),

              rejectedAt:
                serverTimestamp()

            }
          );


          return;
        }


        // ==================================
        // GET USER
        // ==================================

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


        oldBalance =
          Number(
            userData.balance || 0
          );


        const depositAmount =
          Number(
            freshData.amount || 0
          );


        if (
          !Number.isFinite(
            depositAmount
          ) ||
          depositAmount <= 0
        ) {

          throw new Error(
            "Invalid deposit amount."
          );

        }


        newBalance =
          oldBalance +
          depositAmount;


        // ==================================
        // UPDATE USER BALANCE
        // ==================================

        tx.update(
          userRef,
          {

            balance:
              newBalance,

            lastDepositAmount:
              depositAmount,

            lastDepositAt:
              serverTimestamp()

          }
        );


        // ==================================
        // UPDATE DEPOSIT
        // ==================================

        tx.update(
          depositRef,
          {

            status:
              "approved",

            processedAt:
              serverTimestamp(),

            balanceBefore:
              oldBalance,

            balanceAfter:
              newBalance

          }
        );

      }
    );


    // ======================================
    // TRANSACTION HISTORY
    // ======================================

    try {

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
            approve
              ? "Deposit Approved"
              : "Deposit Rejected",

          title:
            approve
              ? "Deposit Approved"
              : "Deposit Rejected",

          amount:
            approve
              ? amount
              : 0,

          status:
            approve
              ? "Completed"
              : "Rejected",

          description:
            approve
              ? "Deposit approved by admin"
              : "Deposit rejected by admin",

          depositId:
            depositId,

          paymentTransactionId:
            deposit.transactionId ||
            null,

          createdAt:
            serverTimestamp()

        }
      );


    } catch (historyError) {

      console.error(
        "Transaction history error:",
        historyError
      );

      /*
        The deposit has already been
        processed successfully.
      */

    }


    // ======================================
    // SUCCESS MESSAGE
    // ======================================

    alert(
      approve
        ? "✅ Deposit approved successfully.\nUser balance updated."
        : "❌ Deposit rejected successfully."
    );


    // ======================================
    // RELOAD
    // ======================================

    await loadDeposits();


  } catch (error) {

    console.error(
      "Process deposit error:",
      error
    );


    alert(
      "❌ " +
      (
        error.message ||
        "Deposit processing failed."
      )
    );


    await loadDeposits();

  }

}