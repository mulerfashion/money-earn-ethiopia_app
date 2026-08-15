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
      "⏳ Checking balance...";


    try {

      const userRef =
        doc(
          db,
          "users",
          currentUser.uid
        );


      // ====================================
      // ALWAYS READ FRESH BALANCE
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
            balance - amount;


          // =================================
          // UPDATE USER BALANCE
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
        freshBalance - amount;


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
        "✅ Withdrawal request submitted successfully. Please wait for admin approval.";


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