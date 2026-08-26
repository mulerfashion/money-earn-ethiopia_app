import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const amountInput =
  document.getElementById("amount");

const methodInput =
  document.getElementById("method");

const accountInput =
  document.getElementById("account");

const withdrawBtn =
  document.getElementById("withdrawBtn");

const message =
  document.getElementById("message");


let currentUser = null;
let userBalance = 0;
let balanceLoaded = false;


// ==========================================
// WITHDRAWAL RULE
// ==========================================

const WITHDRAWAL_DAYS = 7;

const WITHDRAWAL_MS =
  WITHDRAWAL_DAYS *
  24 *
  60 *
  60 *
  1000;


// ==========================================
// CHECK LOGIN + LOAD BALANCE
// ==========================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location.replace("login.html");

    return;
  }


  currentUser = user;
  balanceLoaded = false;


  try {

    const userRef =
      doc(
        db,
        "users",
        user.uid
      );


    const snap =
      await getDoc(userRef);


    if (!snap.exists()) {

      message.textContent =
        "❌ User profile not found.";

      return;
    }


    const data =
      snap.data();


    userBalance =
      Number(
        data.balance || 0
      );


    balanceLoaded = true;


    console.log(
      "Current balance:",
      userBalance
    );


  } catch (error) {

    console.error(
      "USER LOAD ERROR:",
      error
    );


    message.textContent =
      "❌ " +
      (
        error.message ||
        "Failed to load balance."
      );

  }

});


// ==========================================
// CHECK 7-DAY WITHDRAWAL RULE
// ==========================================

function checkWithdrawalCooldown(userData) {

  const lastWithdrawal =
    userData.lastWithdrawalAt;


  // No previous withdrawal
  if (!lastWithdrawal) {

    return {
      allowed: true,
      remaining: 0
    };

  }


  let lastDate;


  // Firestore Timestamp
  if (
    typeof lastWithdrawal.toDate ===
    "function"
  ) {

    lastDate =
      lastWithdrawal.toDate();

  }

  // JavaScript Date
  else if (
    lastWithdrawal instanceof Date
  ) {

    lastDate =
      lastWithdrawal;

  }

  else {

    return {
      allowed: true,
      remaining: 0
    };

  }


  const now =
    Date.now();


  const lastTime =
    lastDate.getTime();


  const elapsed =
    now - lastTime;


  // ========================================
  // 7 DAYS COMPLETED
  // ========================================

  if (
    elapsed >=
    WITHDRAWAL_MS
  ) {

    return {
      allowed: true,
      remaining: 0
    };

  }


  // ========================================
  // REMAINING TIME
  // ========================================

  const remainingMs =
    WITHDRAWAL_MS -
    elapsed;


  const remainingDays =
    Math.ceil(
      remainingMs /
      (
        24 *
        60 *
        60 *
        1000
      )
    );


  const remainingHours =
    Math.ceil(
      remainingMs /
      (
        60 *
        60 *
        1000
      )
    );


  return {

    allowed: false,

    remainingDays:
      remainingDays,

    remainingHours:
      remainingHours,

    lastDate:
      lastDate

  };

}


// ==========================================
// WITHDRAW
// ==========================================

withdrawBtn.addEventListener(
  "click",
  async () => {


    // ======================================
    // LOGIN CHECK
    // ======================================

    if (!currentUser) {

      message.textContent =
        "❌ Please login first.";

      return;
    }


    // ======================================
    // BALANCE LOADING CHECK
    // ======================================

    if (!balanceLoaded) {

      message.textContent =
        "⏳ Please wait. Your balance is loading...";

      return;
    }


    const amount =
      Number(
        amountInput.value
      );


    const method =
      methodInput.value;


    const account =
      accountInput.value.trim();


    // ======================================
    // VALIDATION
    // ======================================

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      message.textContent =
        "❌ Enter a valid amount.";

      return;
    }


    if (
      amount < 100
    ) {

      message.textContent =
        "❌ Minimum withdrawal is 100 ETB.";

      return;
    }


    if (
      !method ||
      !account
    ) {

      message.textContent =
        "❌ Complete all fields.";

      return;
    }


    withdrawBtn.disabled =
      true;


    message.textContent =
      "⏳ Checking withdrawal eligibility...";


    try {

      const userRef =
        doc(
          db,
          "users",
          currentUser.uid
        );


      // ====================================
      // READ FRESH USER DATA
      // ====================================

      const freshUserSnap =
        await getDoc(userRef);


      if (!freshUserSnap.exists()) {

        throw new Error(
          "User profile not found."
        );

      }


      const freshUserData =
        freshUserSnap.data();


      // ====================================
      // CHECK 7-DAY RULE
      // ====================================

      const cooldown =
        checkWithdrawalCooldown(
          freshUserData
        );


      if (!cooldown.allowed) {

        throw new Error(
          "You can withdraw only once every 7 days. " +
          cooldown.remainingDays +
          " day(s) remaining."
        );

      }


      // ====================================
      // FRESH BALANCE
      // ====================================

      const freshBalance =
        Number(
          freshUserData.balance || 0
        );


      console.log(
        "Fresh Firestore balance:",
        freshBalance
      );


      // ====================================
      // BALANCE CHECK
      // ====================================

      if (
        !Number.isFinite(freshBalance) ||
        amount > freshBalance
      ) {

        throw new Error(
          "Insufficient balance. Your balance is " +
          freshBalance.toFixed(2) +
          " ETB."
        );

      }


      message.textContent =
        "⏳ Submitting withdrawal...";


      // ====================================
      // CREATE REFERENCES
      // ====================================

      const withdrawalRef =
        doc(
          collection(
            db,
            "withdrawals"
          )
        );


      const transactionRef =
        doc(
          collection(
            db,
            "transactions"
          )
        );


      // ====================================
      // FIRESTORE TRANSACTION
      // ====================================

      await runTransaction(
        db,
        async (tx) => {


          // --------------------------------
          // READ USER AGAIN
          // --------------------------------

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


          // --------------------------------
          // CHECK 7-DAY RULE AGAIN
          // --------------------------------

          const cooldown =
            checkWithdrawalCooldown(
              userData
            );


          if (!cooldown.allowed) {

            throw new Error(
              "You can withdraw only once every 7 days. " +
              cooldown.remainingDays +
              " day(s) remaining."
            );

          }


          // --------------------------------
          // CURRENT BALANCE
          // --------------------------------

          const balance =
            Number(
              userData.balance || 0
            );


          // --------------------------------
          // FINAL BALANCE CHECK
          // --------------------------------

          if (
            !Number.isFinite(balance) ||
            amount > balance
          ) {

            throw new Error(
              "Insufficient balance. Current balance is " +
              balance.toFixed(2) +
              " ETB."
            );

          }


          const newBalance =
            balance -
            amount;


          // =================================
          // UPDATE USER
          // =================================

          tx.update(
            userRef,
            {

              balance:
                newBalance,

              lastWithdrawalAmount:
                amount,

              lastWithdrawalAt:
                serverTimestamp()

            }
          );


          // =================================
          // CREATE WITHDRAWAL REQUEST
          // =================================

          tx.set(
            withdrawalRef,
            {

              uid:
                currentUser.uid,

              userId:
                currentUser.uid,

              amount:
                amount,

              method:
                method,

              account:
                account,

              status:
                "pending",

              createdAt:
                serverTimestamp()

            }
          );


          // =================================
          // TRANSACTION HISTORY
          // =================================

          tx.set(
            transactionRef,
            {

              uid:
                currentUser.uid,

              userId:
                currentUser.uid,

              type:
                "Withdrawal",

              title:
                "Withdrawal",

              amount:
                -amount,

              status:
                "pending",

              withdrawalId:
                withdrawalRef.id,

              method:
                method,

              account:
                account,

              balanceBefore:
                balance,

              balanceAfter:
                newBalance,

              createdAt:
                serverTimestamp()

            }
          );

        }
      );


      // ======================================
      // UPDATE LOCAL BALANCE
      // ======================================

      userBalance =
        freshBalance -
        amount;


      // ======================================
      // CLEAR FORM
      // ======================================

      amountInput.value =
        "";

      accountInput.value =
        "";

      methodInput.value =
        "";


      // ======================================
      // SUCCESS
      // ======================================

      message.textContent =
        "✅ Withdrawal request submitted successfully. " +
        "You can make your next withdrawal after 7 days.";


      console.log(
        "Withdrawal successful:",
        amount
      );


    } catch (error) {

      console.error(
        "WITHDRAWAL ERROR:",
        error
      );


      console.error(
        "ERROR CODE:",
        error.code
      );


      message.textContent =
        "❌ " +
        (
          error.message ||
          "Withdrawal failed."
        );


    } finally {

      withdrawBtn.disabled =
        false;

    }

  }
);