import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ==========================================
// ELEMENTS
// ==========================================

const depositBtn =
  document.getElementById("depositBtn");

const message =
  document.getElementById("message");

const amountInput =
  document.getElementById("amount");

const phoneInput =
  document.getElementById("phone");

const transactionInput =
  document.getElementById("transaction");


// ==========================================
// CHECK ELEMENTS
// ==========================================

if (
  !depositBtn ||
  !message ||
  !amountInput ||
  !phoneInput ||
  !transactionInput
) {

  throw new Error(
    "Deposit form elements are missing."
  );

}


// ==========================================
// AUTH
// ==========================================

let currentUser = null;

depositBtn.disabled = true;


onAuthStateChanged(
  auth,
  (user) => {

    if (!user) {

      window.location.replace(
        "login.html"
      );

      return;
    }

    currentUser =
      user;

    depositBtn.disabled =
      false;

  }
);


// ==========================================
// SUBMIT DEPOSIT
// ==========================================

depositBtn.addEventListener(
  "click",
  async () => {

    if (!currentUser) {

      message.textContent =
        "❌ Please wait for authentication.";

      return;
    }


    // ========================================
    // GET VALUES
    // ========================================

    const amount =
      Number(
        amountInput.value
      );

    const phone =
      phoneInput.value.trim();

    const transactionId =
      transactionInput.value.trim();


    // ========================================
    // VALIDATE AMOUNT
    // ========================================

    if (
      !Number.isFinite(amount) ||
      amount < 100
    ) {

      message.textContent =
        "❌ Minimum deposit is 100 ETB.";

      return;
    }


    // ========================================
    // VALIDATE PHONE
    // ========================================

    if (!phone) {

      message.textContent =
        "❌ Enter your phone number.";

      return;
    }


    // ========================================
    // VALIDATE TRANSACTION ID
    // ========================================

    if (!transactionId) {

      message.textContent =
        "❌ Enter your transaction ID.";

      return;
    }


    // ========================================
    // DISABLE BUTTON
    // ========================================

    depositBtn.disabled =
      true;

    message.textContent =
      "⏳ Submitting deposit request...";


    try {

      // ======================================
      // CREATE DEPOSIT REQUEST
      // ======================================

      await addDoc(
        collection(
          db,
          "deposits"
        ),
        {

          // IMPORTANT:
          // Rules use request.resource.data.uid

          uid:
            currentUser.uid,

          amount:
            amount,

          phone:
            phone,

          transactionId:
            transactionId,

          status:
            "pending",

          createdAt:
            serverTimestamp()

        }
      );


      // ======================================
      // SUCCESS
      // ======================================

      message.textContent =
        "✅ Deposit request submitted successfully. Please wait for approval.";


      // ======================================
      // CLEAR FORM
      // ======================================

      amountInput.value =
        "";

      phoneInput.value =
        "";

      transactionInput.value =
        "";


    } catch (error) {

      console.error(
        "Deposit error:",
        error
      );

      console.error(
        "Error code:",
        error.code
      );

      console.error(
        "Error message:",
        error.message
      );


      if (
        error.code ===
        "permission-denied"
      ) {

        message.textContent =
          "❌ Permission denied. Deposit request was blocked by Firestore Rules.";

      } else {

        message.textContent =
          "❌ " +
          (
            error.message ||
            "Deposit failed."
          );

      }

    } finally {

      depositBtn.disabled =
        false;

    }

  }
);