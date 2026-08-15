import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const claimBtn =
  document.getElementById("claimBtn");

const message =
  document.getElementById("message");


const BONUS = 10;

let currentUser = null;


// ==========================================
// AUTH
// ==========================================

onAuthStateChanged(auth, (user) => {

  if (!user) {

    window.location.replace("login.html");

    return;
  }

  currentUser = user;

});


// ==========================================
// CLAIM DAILY BONUS
// ==========================================

claimBtn.addEventListener("click", async () => {

  if (!currentUser) {

    message.textContent =
      "❌ Please wait for login to finish.";

    return;
  }


  claimBtn.disabled = true;

  message.textContent =
    "⏳ Checking daily bonus...";


  try {

    const userRef =
      doc(
        db,
        "users",
        currentUser.uid
      );


    // --------------------------------------
    // USE LOCAL DATE
    // Ethiopia = UTC+3
    // --------------------------------------

    const now =
      new Date();


    const today =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: "Africa/Addis_Ababa",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }
      ).format(now);


    // --------------------------------------
    // UNIQUE TRANSACTION ID
    // --------------------------------------

    const transactionId =
      currentUser.uid +
      "_bonus_" +
      today;


    const transactionRef =
      doc(
        db,
        "transactions",
        transactionId
      );


    // ======================================
    // FIRESTORE TRANSACTION
    // ======================================

    await runTransaction(
      db,
      async (tx) => {

        // ----------------------------------
        // READ USER
        // ----------------------------------

        const userSnap =
          await tx.get(userRef);


        if (!userSnap.exists()) {

          throw new Error(
            "User profile not found."
          );

        }


        const userData =
          userSnap.data();


        // ----------------------------------
        // CHECK DAILY BONUS
        // ----------------------------------

        if (
          userData.lastBonusDate ===
          today
        ) {

          throw new Error(
            "You already claimed today's bonus."
          );

        }


        // ----------------------------------
        // BALANCE
        // ----------------------------------

        const currentBalance =
          Number(
            userData.balance ?? 0
          );


        const newBalance =
          currentBalance +
          BONUS;


        // ----------------------------------
        // UPDATE USER
        // ----------------------------------

        tx.update(
          userRef,
          {

            balance:
              newBalance,

            lastBonusDate:
              today

          }
        );


        // ----------------------------------
        // TRANSACTION HISTORY
        // ----------------------------------

        tx.set(
          transactionRef,
          {

            uid:
              currentUser.uid,

            userId:
              currentUser.uid,

            type:
              "daily_bonus",

            title:
              "Daily Bonus",

            description:
              "Daily bonus reward",

            amount:
              BONUS,

            status:
              "Completed",

            balanceBefore:
              currentBalance,

            balanceAfter:
              newBalance,

            bonusDate:
              today,

            createdAt:
              serverTimestamp()

          }
        );

      }
    );


    // ======================================
    // SUCCESS
    // ======================================

    message.textContent =
      "✅ Daily Bonus claimed! +" +
      BONUS +
      " ETB";


    claimBtn.textContent =
      "✅ Bonus Claimed";


    claimBtn.disabled =
      true;


  } catch (error) {

    console.error(
      "DAILY BONUS ERROR:",
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


    if (
      error.message ===
      "You already claimed today's bonus."
    ) {

      message.textContent =
        "⚠️ You already claimed today's bonus.";

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
        "❌ Firestore Rules blocked the Daily Bonus.";

    } else {

      message.textContent =
        "❌ " +
        (
          error.message ||
          "Daily Bonus failed."
        );

    }


    claimBtn.disabled =
      false;

  }

});