import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const buttons =
  document.querySelectorAll(".investBtn");

const message =
  document.getElementById("message");


let currentUser = null;


// ==========================================
// MAXIMUM ACTIVE INVESTMENTS
// ==========================================

const MAX_ACTIVE_INVESTMENTS = 3;


// ==========================================
// LOGIN
// ==========================================

onAuthStateChanged(auth, (user) => {

  if (!user) {

    window.location.replace("login.html");

    return;
  }

  currentUser = user;

});


// ==========================================
// INVESTMENT BUTTONS
// ==========================================

buttons.forEach((btn) => {

  btn.addEventListener("click", async () => {

    if (!currentUser) {

      message.textContent =
        "❌ Please login first.";

      return;
    }


    const price =
      Number(btn.dataset.price);


    const income =
      Number(btn.dataset.income);


    // ======================================
    // VALIDATION
    // ======================================

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {

      message.textContent =
        "❌ Invalid investment amount.";

      return;
    }


    if (
      !Number.isFinite(income) ||
      income <= 0
    ) {

      message.textContent =
        "❌ Invalid daily return.";

      return;
    }


    buttons.forEach((button) => {
      button.disabled = true;
    });


    message.textContent =
      "⏳ Checking investment...";


    try {

      // ====================================
      // CHECK ACTIVE INVESTMENTS
      // ====================================

      const investmentQuery =
        query(
          collection(db, "investments"),
          where(
            "userId",
            "==",
            currentUser.uid
          ),
          where(
            "status",
            "==",
            "Active"
          )
        );


      const investmentSnap =
        await getDocs(
          investmentQuery
        );


      const activeCount =
        investmentSnap.size;


      if (
        activeCount >=
        MAX_ACTIVE_INVESTMENTS
      ) {

        throw new Error(
          "Maximum 3 active investments allowed."
        );

      }


      // ====================================
      // USER REFERENCE
      // ====================================

      const userRef =
        doc(
          db,
          "users",
          currentUser.uid
        );


      // ====================================
      // UNIQUE INVESTMENT ID
      // ====================================

      const investmentId =
        currentUser.uid +
        "_investment_" +
        Date.now();


      const investmentRef =
        doc(
          db,
          "investments",
          investmentId
        );


      // ====================================
      // TRANSACTION ID
      // ====================================

      const transactionId =
        currentUser.uid +
        "_investment_purchase_" +
        Date.now();


      const transactionRef =
        doc(
          db,
          "transactions",
          transactionId
        );


      // ====================================
      // FIRESTORE TRANSACTION
      // ====================================

      await runTransaction(
        db,
        async (tx) => {

          // --------------------------------
          // GET USER
          // --------------------------------

          const userSnap =
            await tx.get(
              userRef
            );


          if (!userSnap.exists()) {

            throw new Error(
              "User data not found."
            );

          }


          const userData =
            userSnap.data();


          const currentBalance =
            Number(
              userData.balance ?? 0
            );


          // --------------------------------
          // CHECK BALANCE
          // --------------------------------

          if (
            currentBalance <
            price
          ) {

            throw new Error(
              "Insufficient balance. Your balance is " +
              currentBalance.toFixed(2) +
              " ETB"
            );

          }


          // --------------------------------
          // NEW BALANCE
          // --------------------------------

          const newBalance =
            currentBalance -
            price;


          // --------------------------------
          // USER INVESTMENT SUMMARY
          // --------------------------------

          tx.update(
            userRef,
            {

              balance:
                newBalance,

              lastInvestmentAmount:
                price,

              lastInvestmentReturn:
                income

            }
          );


          // --------------------------------
          // CREATE INVESTMENT
          // --------------------------------

          tx.set(
            investmentRef,
            {

              uid:
                currentUser.uid,

              userId:
                currentUser.uid,

              amount:
                price,

              dailyReturn:
                income,

              status:
                "Active",

              lastClaimDate:
                null,

              createdAt:
                serverTimestamp()

            }
          );


          // --------------------------------
          // HISTORY
          // --------------------------------

          tx.set(
            transactionRef,
            {

              uid:
                currentUser.uid,

              userId:
                currentUser.uid,

              type:
                "Investment",

              title:
                "Investment",

              amount:
                -price,

              status:
                "Completed",

              description:
                "Investment purchase",

              investmentAmount:
                price,

              dailyReturn:
                income,

              balanceBefore:
                currentBalance,

              balanceAfter:
                newBalance,

              createdAt:
                serverTimestamp()

            }
          );

        }
      );


      // ====================================
      // SUCCESS
      // ====================================

      message.textContent =
        "✅ Investment activated successfully. " +
        price.toFixed(2) +
        " ETB deducted.";


    } catch (error) {

      console.error(
        "INVESTMENT ERROR:",
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


      message.textContent =
        "❌ " +
        (
          error.message ||
          "Investment failed."
        );


    } finally {

      buttons.forEach((button) => {
        button.disabled = false;
      });

    }

  });

});