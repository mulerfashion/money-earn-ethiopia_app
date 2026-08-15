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


const refLink =
  document.getElementById("refLink");

const copyBtn =
  document.getElementById("copyBtn");

const shareBtn =
  document.getElementById("shareBtn");

const message =
  document.getElementById("message");

const referralCount =
  document.getElementById("referralCount");

const referralEarn =
  document.getElementById("referralEarn");

const referralList =
  document.getElementById("referralList");


function setMessage(text) {

  if (message) {
    message.textContent = text;
  }

}


function showFriendError(error) {

  console.error("REFERRAL ERROR:", error);

  if (referralList) {

    referralList.innerHTML = `
      <p style="color:red;">
        ❌ ${error.message}
      </p>
    `;

  }

}


onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location.replace("login.html");

    return;
  }


  if (referralList) {

    referralList.innerHTML = `
      <p>
        ⏳ Loading friends...
      </p>
    `;

  }


  try {

    // ======================================
    // CURRENT USER
    // ======================================

    const userRef =
      doc(
        db,
        "users",
        user.uid
      );


    const userSnap =
      await getDoc(userRef);


    if (!userSnap.exists()) {

      throw new Error(
        "Your user profile was not found."
      );

    }


    const userData =
      userSnap.data();


    // ======================================
    // REFERRAL CODE
    // ======================================

    const referralCode =
      String(
        userData.referralCode || ""
      )
        .trim()
        .toUpperCase();


    if (!referralCode) {

      throw new Error(
        "Referral code not found."
      );

    }


    // ======================================
    // REFERRAL LINK
    // ======================================

    const registerURL =
      new URL(
        "register.html",
        window.location.href
      )
        .href
        .split("?")[0]
      +
      "?ref="
      +
      encodeURIComponent(
        referralCode
      );


    if (refLink) {

      refLink.value =
        registerURL;

    }


    // ======================================
    // FIND FRIENDS
    // ======================================

    const friendsQuery =
      query(
        collection(db, "users"),
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


    // ======================================
    // COUNT
    // ======================================

    const count =
      friends.length;


    if (referralCount) {

      referralCount.textContent =
        `${count} Friends`;

    }


    // ======================================
    // REFERRAL EARNINGS
    // ======================================

    const earnings =
      count * 20;


    if (referralEarn) {

      referralEarn.textContent =
        earnings.toFixed(2)
        +
        " ETB";

    }


    // ======================================
    // FRIEND LIST
    // ======================================

    if (!referralList) {

      return;

    }


    referralList.innerHTML = "";


    if (count === 0) {

      referralList.innerHTML = `
        <p>
          👥 No friends have joined yet.
        </p>
      `;

    } else {


      friends.forEach((friendDoc) => {

        const friend =
          friendDoc.data();


        const name =
          friend.name ||
          "Unnamed User";


        const email =
          friend.email ||
          "Email unavailable";


        let joinedDate =
          "Date unavailable";


        if (
          friend.createdAt &&
          typeof friend.createdAt.toDate ===
          "function"
        ) {

          joinedDate =
            friend.createdAt
              .toDate()
              .toLocaleString();

        }


        const friendBox =
          document.createElement("div");


        friendBox.style.marginBottom =
          "15px";

        friendBox.style.padding =
          "12px";

        friendBox.style.border =
          "1px solid #ddd";

        friendBox.style.borderRadius =
          "10px";


        friendBox.innerHTML = `

          <strong>
            👤 ${name}
          </strong>

          <br>

          <small>
            📧 ${email}
          </small>

          <br>

          <small>
            📅 Joined: ${joinedDate}
          </small>

          <br>

          <small>
            💰 Referral Reward: 20 ETB
          </small>

        `;


        referralList.appendChild(
          friendBox
        );

      });

    }


    setMessage(
      "✅ Referral information loaded."
    );


  } catch (error) {

    showFriendError(error);

    setMessage(
      "❌ Failed to load referral information."
    );

  }

});


// ==========================================
// COPY LINK
// ==========================================

if (copyBtn) {

  copyBtn.addEventListener(
    "click",
    async () => {

      if (!refLink?.value) {

        setMessage(
          "Referral link is not ready."
        );

        return;
      }


      try {

        await navigator.clipboard.writeText(
          refLink.value
        );

        setMessage(
          "✅ Referral link copied."
        );

      } catch {

        refLink.focus();

        refLink.select();

        document.execCommand("copy");

        setMessage(
          "✅ Referral link copied."
        );

      }

    }
  );

}


// ==========================================
// SHARE LINK
// ==========================================

if (shareBtn) {

  shareBtn.addEventListener(
    "click",
    async () => {

      if (!refLink?.value) {

        setMessage(
          "Referral link is not ready."
        );

        return;
      }


      if (navigator.share) {

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


        } catch {

          // User cancelled.

        }

      } else {

        try {

          await navigator.clipboard.writeText(
            refLink.value
          );

          setMessage(
            "📋 Sharing is not supported. Link copied."
          );

        } catch {

          setMessage(
            "Unable to share link."
          );

        }

      }

    }
  );

}