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


// ==========================================
// ELEMENTS
// ==========================================

const watchVideoBtn =
  document.getElementById("watchVideoBtn");

const claimBtn =
  document.getElementById("claimReturnBtn");

const videoTimer =
  document.getElementById("videoTimer");

const message =
  document.getElementById("message");


let currentUser = null;

let videoCompleted = false;

let videoRunning = false;


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
// GET ETHIOPIA DATE
// ==========================================

function getToday() {

  return new Intl.DateTimeFormat(
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
  ).format(new Date());

}


// ==========================================
// WATCH VIDEO
// ==========================================

if (watchVideoBtn) {

  watchVideoBtn.addEventListener(
    "click",
    async () => {

      if (!currentUser) {

        message.textContent =
          "❌ Please login first.";

        return;
      }


      if (videoRunning) {

        return;

      }


      videoRunning = true;

      watchVideoBtn.disabled = true;

      claimBtn.disabled = true;

      watchVideoBtn.textContent =
        "🎥 Watching...";


      // ====================================
      // 30 SECOND DEMO VIDEO TIMER
      // ====================================

      let seconds = 30;


      videoTimer.textContent =
        "⏱️ " +
        seconds +
        " seconds remaining";


      const timer =
        setInterval(
          () => {

            seconds--;


            videoTimer.textContent =
              "⏱️ " +
              seconds +
              " seconds remaining";


            if (seconds <= 0) {

              clearInterval(timer);


              videoCompleted =
                true;


              videoRunning =
                false;


              watchVideoBtn.textContent =
                "✅ Video Completed";


              videoTimer.textContent =
                "✅ Video completed successfully.";


              claimBtn.disabled =
                false;


              claimBtn.textContent =
                "💵 Claim Daily Return";


              message.textContent =
                "🎉 You can now claim today's available return.";

            }

          },
          1000
        );

    }
  );

}


// ==========================================
// CLAIM DAILY RETURN
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


      if (!videoCompleted) {

        message.textContent =
          "❌ Please complete the video first.";

        return;
      }


      claimBtn.disabled =
        true;


      message.textContent =
        "⏳ Checking investment return...";


      try {

        // ==================================
        // TODAY
        // ==================================

        const today =
          getToday();


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

          throw new Error(
            "No active investment."
          );

        }


        // ==================================
        // TOTAL RETURN
        // ==================================

        let totalReturn =
          0;


        snapshot.forEach(
          (investmentDoc) => {

            const data =
              investmentDoc.data();


            const dailyReturn =
              Number(
                data.dailyReturn ?? 0
              );


            if (
              Number.isFinite(
                dailyReturn
              ) &&
              dailyReturn > 0
            ) {

              totalReturn +=
                dailyReturn;

            }

          }
        );


        if (
          !Number.isFinite(
            totalReturn
          ) ||
          totalReturn <= 0
        ) {

          throw new Error(
            "Invalid investment return."
          );

        }


        // ==================================
        // USER
        // ==================================

        const userRef =
          doc(
            db,
            "users",
            currentUser.uid
          );


        // ==================================
        // TRANSACTION ID
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
            // CHECK DAILY CLAIM
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
                  "Daily Video Reward",

                amount:
                  totalReturn,

                status:
                  "Completed",

                description:
                  "Demo daily video task reward",

                balanceBefore:
                  currentBalance,

                balanceAfter:
                  newBalance,

                returnDate:
                  today,

                taskType:
                  "video",

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


        videoTimer.textContent =
          "Today's video reward has been claimed.";


        watchVideoBtn.disabled =
          true;


        claimBtn.disabled =
          true;


      } catch (error) {

        console.error(
          "INVESTMENT RETURN ERROR:",
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