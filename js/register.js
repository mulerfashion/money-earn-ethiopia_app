import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


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
// GET REFERRAL CODE FROM URL
// ==========================================

const params =
  new URLSearchParams(
    window.location.search
  );

const urlReferralCode =
  (
    params.get("ref") || ""
  )
    .trim()
    .toUpperCase();


// Put referral code into input automatically
if (
  urlReferralCode &&
  referralInput
) {

  referralInput.value =
    urlReferralCode;

}


// ==========================================
// REGISTER BUTTON
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


    // ========================================
    // VALIDATION
    // ========================================

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


    registerBtn.disabled =
      true;

    registerBtn.textContent =
      "Creating Account...";


    try {

      // ======================================
      // CREATE FIREBASE AUTH ACCOUNT
      // ======================================

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );


      const user =
        credential.user;


      // ======================================
      // CREATE REFERRAL CODE
      // ======================================

      const myReferralCode =
        user.uid
          .substring(0, 8)
          .toUpperCase();


      // ======================================
      // FIND INVITER
      // ======================================

      let inviterId =
        null;


      if (referralCode) {

        const q =
          query(
            collection(db, "users"),
            where(
              "referralCode",
              "==",
              referralCode
            )
          );


        const snap =
          await getDocs(q);


        if (
          !snap.empty &&
          snap.docs[0].id !== user.uid
        ) {

          inviterId =
            snap.docs[0].id;

        }

      }


      // ======================================
      // NEW USER DOCUMENT
      // ======================================

      const userRef =
        doc(
          db,
          "users",
          user.uid
        );


      await setDoc(
        userRef,
        {

          name:
            name,

          email:
            email,

          balance:
            0,

          referralCode:
            myReferralCode,

          referredBy:
            inviterId,

          role:
            "user",

          createdAt:
            serverTimestamp()

        }
      );


      // ======================================
      // SUCCESS
      // ======================================

      if (inviterId) {

        alert(
          "Registration successful!\n\n" +
          "Referral recorded successfully."
        );

      } else {

        alert(
          "Registration successful!"
        );

      }


      window.location.replace(
        "login.html"
      );


    } catch (error) {

      console.error(
        "Registration error:",
        error
      );


      const messages = {

        "auth/email-already-in-use":
          "This email is already registered.",

        "auth/invalid-email":
          "Please enter a valid email address.",

        "auth/weak-password":
          "Password must be at least 6 characters.",

        "permission-denied":
          "❌ Firestore permission denied. Please check your Firestore Rules."

      };


      alert(
        messages[error.code] ||
        "Registration failed: " +
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