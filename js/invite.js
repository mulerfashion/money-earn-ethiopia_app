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
  where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ==========================================
// ELEMENTS
// ==========================================

const refLink = document.getElementById("refLink");
const copyBtn = document.getElementById("copyBtn");
const shareBtn = document.getElementById("shareBtn");

const message = document.getElementById("message");

const referralCount =
  document.getElementById("referralCount");

const referralEarn =
  document.getElementById("referralEarn");

const referralList =
  document.getElementById("referralList");


// ==========================================
// CONSTANTS
// ==========================================

const REFERRAL_BONUS = 20;


// ==========================================
// MESSAGE
// ==========================================

function setMessage(text) {

  if (message) {
    message.textContent = text;
  }

}


// ==========================================
// ERROR
// ==========================================

function showError(error) {

  console.error("INVITE ERROR:", error);

  if (referralList) {

    referralList.innerHTML = "";

    const errorText =
      document.createElement("p");

    errorText.style.color = "red";

    errorText.textContent =
      "❌ " +
      (
        error?.message ||
        "Failed to load referral information."
      );

    referralList.appendChild(errorText);
  }

}


// ==========================================
// SAFE TEXT
// ==========================================

function safeText(value, fallback = "") {

  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  const text = String(value).trim();

  return text || fallback;
}


// ==========================================
// GET DATE
// ==========================================

function formatDate(value) {

  if (!value) {
    return "Date unavailable";
  }

  try {

    if (
      typeof value.toDate === "function"
    ) {

      return value
        .toDate()
        .toLocaleString();

    }

    if (
      value instanceof Date
    ) {

      return value.toLocaleString();

    }

    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {

      return date.toLocaleString();

    }

  } catch (error) {

    console.warn(
      "Date format error:",
      error
    );

  }

  return "Date unavailable";
}


// ==========================================
// NORMALIZE TRANSACTION TYPE
// ==========================================

function normalizeType(value) {

  return safeText(value)
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

}


// ==========================================
// REFERRAL TRANSACTION TYPES
// ==========================================

const REFERRAL_TRANSACTION_TYPES = new Set([

  "referral_bonus",
  "referral_reward",

  "invite_bonus",
  "invite_reward",

  "friend_bonus",
  "friend_reward",

  "referral",
  "invite",

  "referral_earn",
  "referral_earning",

  "referral_income"

]);


// ==========================================
// LOAD REFERRAL DATA
// ==========================================

async function loadReferralData(user) {

  if (!user) {
    return;
  }


  if (referralList) {

    referralList.innerHTML = `
      <p>⏳ Loading friends...</p>
    `;

  }


  // ========================================
  // CURRENT USER
  // ========================================

  const userRef =
    doc(
      db,
      "users",
      user.uid
    );


  const userSnap =
    await getDoc(
      userRef
    );


  if (!userSnap.exists()) {

    throw new Error(
      "Your user profile was not found."
    );

  }


  const userData =
    userSnap.data();


  // ========================================
  // REFERRAL CODE
  // ========================================

  const referralCode =
    safeText(
      userData.referralCode
    )
      .toUpperCase();


  if (!referralCode) {

    throw new Error(
      "Referral code not found."
    );

  }


  // ========================================
  // REFERRAL LINK
  // ========================================

  const registerURL =
    new URL(
      "register.html",
      window.location.href
    );

  registerURL.search =
    "?ref=" +
    encodeURIComponent(
      referralCode
    );


  const referralURL =
    registerURL.href;


  if (refLink) {

    refLink.value =
      referralURL;

  }


  // ========================================
  // FIND REFERRED USERS
  // ========================================

  const friendsQuery =
    query(
      collection(
        db,
        "users"
      ),
      where(
        "referredBy",
        "==",
        user.uid
      )
    );


  const friendsSnapshot =
    await getDocs(
      friendsQuery
    );


  const friends =
    friendsSnapshot.docs;


  // ========================================
  // FRIEND COUNT
  // ========================================

  const count =
    friends.length;


  if (referralCount) {

    referralCount.textContent =
      `${count} Friends`;

  }


  // ========================================
  // GET TRANSACTIONS
  // ========================================

  const transactionQuery =
    query(
      collection(
        db,
        "transactions"
      ),
      where(
        "uid",
        "==",
        user.uid
      )
    );


  const transactionSnapshot =
    await getDocs(
      transactionQuery
    );


  // ========================================
  // CALCULATE REFERRAL EARNINGS
  // ========================================

  let totalReferralEarn = 0;


  transactionSnapshot.forEach(
    (transactionDoc) => {

      const data =
        transactionDoc.data();


      const type =
        normalizeType(
          data.type
        );


      if (
        REFERRAL_TRANSACTION_TYPES.has(
          type
        )
      ) {

        const amount =
          Number(
            data.amount || 0
          );


        if (
          Number.isFinite(amount) &&
          amount > 0
        ) {

          totalReferralEarn +=
            amount;

        }

      }

    }
  );


  // ========================================
  // REFERRAL EARNINGS DISPLAY
  // ========================================

  if (referralEarn) {

    referralEarn.textContent =
      totalReferralEarn.toFixed(2) +
      " ETB";

  }


  // ========================================
  // FRIEND LIST
  // ========================================

  if (!referralList) {

    setMessage(
      "✅ Referral information loaded."
    );

    return;

  }


  referralList.innerHTML = "";


  // ========================================
  // NO FRIENDS
  // ========================================

  if (count === 0) {

    const emptyText =
      document.createElement("p");

    emptyText.textContent =
      "👥 No friends have joined yet.";

    referralList.appendChild(
      emptyText
    );

  } else {


    // ======================================
    // FRIENDS
    // ======================================

    friends.forEach(
      (friendDoc) => {

        const friend =
          friendDoc.data();


        const name =
          safeText(
            friend.name,
            "Unnamed User"
          );


        const email =
          safeText(
            friend.email,
            "Email unavailable"
          );


        const joinedDate =
          formatDate(
            friend.createdAt
          );


        // ==================================
        // FRIEND BOX
        // ==================================

        const friendBox =
          document.createElement(
            "div"
          );


        friendBox.style.marginBottom =
          "15px";

        friendBox.style.padding =
          "12px";

        friendBox.style.border =
          "1px solid #ddd";

        friendBox.style.borderRadius =
          "10px";


        // ==================================
        // NAME
        // ==================================

        const nameEl =
          document.createElement(
            "strong"
          );

        nameEl.textContent =
          "👤 " + name;


        // ==================================
        // EMAIL
        // ==================================

        const emailEl =
          document.createElement(
            "small"
          );

        emailEl.textContent =
          "📧 " + email;


        // ==================================
        // DATE
        // ==================================

        const dateEl =
          document.createElement(
            "small"
          );

        dateEl.textContent =
          "📅 Joined: " +
          joinedDate;


        // ==================================
        // BONUS
        // ==================================

        const bonusEl =
          document.createElement(
            "small"
          );

        bonusEl.textContent =
          "💰 Referral Bonus: " +
          REFERRAL_BONUS.toFixed(2) +
          " ETB";


        // ==================================
        // APPEND
        // ==================================

        friendBox.appendChild(
          nameEl
        );

        friendBox.appendChild(
          document.createElement("br")
        );

        friendBox.appendChild(
          emailEl
        );

        friendBox.appendChild(
          document.createElement("br")
        );

        friendBox.appendChild(
          dateEl
        );

        friendBox.appendChild(
          document.createElement("br")
        );

        friendBox.appendChild(
          bonusEl
        );


        referralList.appendChild(
          friendBox
        );

      }
    );

  }


  // ========================================
  // SUCCESS
  // ========================================

  setMessage(
    "✅ Referral information loaded."
  );

}


// ==========================================
// LOGIN STATE
// ==========================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.replace(
        "login.html"
      );

      return;

    }


    try {

      await loadReferralData(
        user
      );

    } catch (error) {

      showError(
        error
      );

      setMessage(
        "❌ Failed to load referral information."
      );

    }

  }
);


// ==========================================
// COPY REFERRAL LINK
// ==========================================

if (copyBtn) {

  copyBtn.addEventListener(
    "click",
    async () => {

      if (
        !refLink ||
        !refLink.value
      ) {

        setMessage(
          "Referral link is not ready."
        );

        return;

      }


      try {

        if (
          navigator.clipboard &&
          window.isSecureContext
        ) {

          await navigator.clipboard.writeText(
            refLink.value
          );

        } else {

          refLink.focus();

          refLink.select();

          document.execCommand(
            "copy"
          );

        }


        setMessage(
          "✅ Referral link copied."
        );


      } catch (error) {

        console.error(
          "COPY ERROR:",
          error
        );

        setMessage(
          "❌ Unable to copy referral link."
        );

      }

    }
  );

}


// ==========================================
// SHARE REFERRAL LINK
// ==========================================

if (shareBtn) {

  shareBtn.addEventListener(
    "click",
    async () => {

      if (
        !refLink ||
        !refLink.value
      ) {

        setMessage(
          "Referral link is not ready."
        );

        return;

      }


      // ====================================
      // NATIVE SHARE
      // ====================================

      if (
        typeof navigator.share ===
        "function"
      ) {

        try {

          await navigator.share({

            title:
              "Money Earn Ethiopia",

            text:
              "Join Money Earn Ethiopia using my referral link.",

            url:
              refLink.value

          });


          setMessage(
            "✅ Share completed."
          );


          return;

        } catch (error) {

          if (
            error?.name ===
            "AbortError"
          ) {

            return;

          }

          console.warn(
            "Share error:",
            error
          );

        }

      }


      // ====================================
      // FALLBACK COPY
      // ====================================

      try {

        if (
          navigator.clipboard
        ) {

          await navigator.clipboard.writeText(
            refLink.value
          );

        } else {

          refLink.focus();

          refLink.select();

          document.execCommand(
            "copy"
          );

        }


        setMessage(
          "📋 Sharing is not supported. Link copied."
        );


      } catch (error) {

        console.error(
          "SHARE ERROR:",
          error
        );

        setMessage(
          "❌ Unable to share link."
        );

      }

    }
  );

}