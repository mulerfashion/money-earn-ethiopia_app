import { auth } from "./firebase.js";

import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";


// ==========================================
// FORM ELEMENTS
// ==========================================

const nameInput =
  document.getElementById("name");

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const referralInput =
  document.getElementById("referralCode");

const registerBtn =
  document.getElementById("registerBtn");


// ==========================================
// CHECK FORM
// ==========================================

if (
  !nameInput ||
  !emailInput ||
  !passwordInput ||
  !registerBtn
) {
  throw new Error(
    "Registration form elements are missing."
  );
}


// ==========================================
// FIREBASE FUNCTIONS
// ==========================================

const functions =
  getFunctions();

const createUserProfile =
  httpsCallable(
    functions,
    "createUserProfile"
  );


// ==========================================
// URL REFERRAL
// ==========================================

const params =
  new URLSearchParams(
    window.location.search
  );

const urlReferralCode =
  String(
    params.get("ref") || ""
  )
    .trim()
    .toUpperCase();


// ==========================================
// AUTO FILL REFERRAL
// ==========================================

if (
  urlReferralCode &&
  referralInput
) {

  referralInput.value =
    urlReferralCode;

}


// ==========================================
// REGISTER
// ==========================================

registerBtn.addEventListener(
  "click",
  async () => {

    const name =
      nameInput.value.trim();

    const email =
      emailInput.value
        .trim()
        .toLowerCase();

    const password =
      passwordInput.value;

    const referralCode =
      referralInput
        ? referralInput.value
            .trim()
            .toUpperCase()
        : "";


    // ======================================
    // VALIDATION
    // ======================================

    if (
      !name ||
      !email ||
      !password
    ) {

      alert(
        "Please fill in all required fields."
      );

      return;
    }


    if (
      password.length < 6
    ) {

      alert(
        "Password must be at least 6 characters."
      );

      return;
    }


    // ======================================
    // DISABLE BUTTON
    // ======================================

    registerBtn.disabled =
      true;

    registerBtn.textContent =
      "Creating Account...";


    try {

      // ====================================
      // CREATE AUTH ACCOUNT
      // ====================================

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );


      const user =
        credential.user;


      console.log(
        "AUTH USER CREATED:",
        user.uid
      );


      // ====================================
      // CREATE FIRESTORE PROFILE
      // ====================================

      const result =
        await createUserProfile({

          name:
            name,

          email:
            email,

          referralCode:
            referralCode

        });


      console.log(
        "PROFILE RESULT:",
        result.data
      );


      // ====================================
      // SUCCESS
      // ====================================

      if (
        result.data?.referralBonus
      ) {

        alert(
          "Registration successful!\n\n" +
          "👥 Referral Bonus\n" +
          "+20 ETB added to inviter balance."
        );

      } else {

        alert(
          "Registration successful!"
        );

      }


      // ====================================
      // LOGIN PAGE
      // ====================================

      window.location.replace(
        "login.html"
      );


    } catch (error) {

      console.error(
        "REGISTRATION ERROR:",
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


      // ====================================
      // FIREBASE AUTH ERRORS
      // ====================================

      const messages = {

        "auth/email-already-in-use":
          "This email is already registered.",

        "auth/invalid-email":
          "Please enter a valid email address.",

        "auth/weak-password":
          "Password must be at least 6 characters.",

        "auth/network-request-failed":
          "❌ Internet connection problem.",

        "functions/unauthenticated":
          "❌ Authentication failed. Please try again.",

        "functions/not-found":
          "❌ Referral account not found.",

        "functions/already-exists":
          "⚠️ This referral bonus has already been processed.",

        "functions/invalid-argument":
          "❌ Please check the registration information.",

        "functions/failed-precondition":
          "❌ Server validation failed."

      };


      alert(
        messages[error.code] ||
        "❌ Registration failed:\n" +
        (
          error.message ||
          "Unknown error"
        )
      );

    } finally {

      registerBtn.disabled =
        false;

      registerBtn.textContent =
        "Create Account";

    }

  }
);