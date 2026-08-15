import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const claimBtn =
  document.getElementById("claimReturnBtn");

const message =
  document.getElementById("message");


let currentUser = null;


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
// CLAIM DAILY INVESTMENT RETURN
// ==========================================

if (claimBtn) {

  claimBtn.addEventListener(
    "click",
    async () => {

      if (!currentUser) {

        message.textContent =
          "❌ Please login first.";

        return;
      }


      claimBtn.disabled = true;

      message.textContent =
        "⏳ Checking investment return...";


      try {

        // ==================================
        // ETHIOPIA DATE
        // ==================================

        const today =
          new Intl.DateTimeFormat(
            "en-CA",
            {
              timeZone:
                "Africa/Addis_Ababa",

              year:
                "numeric",

              month:
                "2-digit",

              day:
                "2-digit"
            }
          ).format(
            new Date()
          );


        // ==================================
        // LOAD ACTIVE INVESTMENTS
        // ==================================

        const investmentQuery =
          query(
            collection(
              db,
              "investments"
            ),

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


        const snapshot =
          await getDocs(
            investmentQuery
          );


        if (snapshot.empty) {

          message.textContent =
            "❌ No active investment.";

          claimBtn.disabled = false;

          return;
        }


        // ==================================
        // CALCULATE TOTAL DAILY RETURN
        // ==================================

        let totalReturn = 0;


        snapshot.forEach(
          (investmentDoc) => {

            const data =
              investmentDoc.data();


            const dailyReturn =
              Number(
                data.dailyReturn ?? 0
              );


            if (
              Number.isFinite(dailyReturn) &&
              dailyReturn > 0
            ) {

              totalReturn +=
                dailyReturn;

            }

          }
        );


        if (
          !Number.isFinite(totalReturn) ||
          totalReturn <= 0
        ) {

          message.textContent =
            "❌ Invalid investment return.";

          claimBtn.disabled = false;

          return;
        }


        // ==================================
        // USER REFERENCE
        // ==================================

        const userRef =
          doc(
            db,
            "users",
            currentUser.uid
          );


        // ==================================
        // DAILY TRANSACTION ID
        // ==================================

        const transactionId =
          currentUser.uid +
          "_investment_return_" +
          today;


        const transactionRef =
          doc(
            db,
            "transactions",
            transactionId
          );


        // ==================================
        // FIRESTORE TRANSACTION
        // ==================================

        await runTransaction(
          db,
          async (tx) => {

            // ------------------------------
            // GET USER
            // ------------------------------

            const userSnap =
              await tx.get(
                userRef
              );


            if (!userSnap.exists()) {

              throw new Error(
                "User profile not found."
              );

            }


            const userData =
              userSnap.data();


            // ------------------------------
            // CHECK TODAY
            // ------------------------------

            if (
              userData.lastInvestmentReturnDate ===
              today
            ) {

              throw new Error(
                "You already claimed today's investment return."
              );

            }


            // ------------------------------
            // BALANCE
            // ------------------------------

            const currentBalance =
              Number(
                userData.balance ?? 0
              );


            const newBalance =
              currentBalance +
              totalReturn;


            // ------------------------------
            // UPDATE USER
            // ------------------------------

            tx.update(
              userRef,
              {

                balance:
                  newBalance,

                lastInvestmentReturnDate:
                  today

              }
            );


            // ------------------------------
            // SAVE TRANSACTION
            // ------------------------------

            tx.set(
              transactionRef,
              {

                uid:
                  currentUser.uid,

                userId:
                  currentUser.uid,

                type:
                  "Investment Daily Return",

                title:
                  "Investment Daily Return",

                amount:
                  totalReturn,

                status:
                  "Completed",

                description:
                  "Daily return from active investment",

                balanceBefore:
                  currentBalance,

                balanceAfter:
                  newBalance,

                returnDate:
                  today,

                createdAt:
                  serverTimestamp()

              }
            );

          }
        );


        // ==================================
        // SUCCESS
        // ==================================

        message.textContent =
          "✅ +" +
          totalReturn.toFixed(2) +
          " ETB added to your wallet.";


        claimBtn.textContent =
          "✅ Return Claimed";


        claimBtn.disabled =
          true;


      } catch (error) {

        console.error(
          "INVESTMENT RETURN ERROR:",
          error
        );


        if (
          error.message ===
          "You already claimed today's investment return."
        ) {

          message.textContent =
            "⚠️ You already claimed today's investment return.";

          claimBtn.textContent =
            "Already Claimed";

          claimBtn.disabled =
            true;

          return;
        }


        if (
          error.code ===
          "permission-denied"
        ) {

          message.textContent =
            "❌ Firestore Rules blocked the investment return.";

        } else {

          message.textContent =
            "❌ " +
            (
              error.message ||
              "Investment return failed."
            );

        }


        claimBtn.disabled =
          false;

      }

    }
  );

}