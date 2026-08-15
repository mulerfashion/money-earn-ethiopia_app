import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  doc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const claimVipBtn =
  document.getElementById("claimVipBtn");

const vipMessage =
  document.getElementById("vipMessage");


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
// BUY VIP
// ==========================================

async function buyVip(
  level,
  price,
  dailyIncome
) {

  if (!currentUser) {

    alert("❌ Please login first.");

    return;
  }


  price =
    Number(price);

  dailyIncome =
    Number(dailyIncome);


  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {

    alert("❌ Invalid VIP price.");

    return;
  }


  if (
    !Number.isFinite(dailyIncome) ||
    dailyIncome <= 0
  ) {

    alert("❌ Invalid daily income.");

    return;
  }


  try {

    const userRef =
      doc(
        db,
        "users",
        currentUser.uid
      );


    const transactionId =
      currentUser.uid +
      "_vip_purchase_" +
      level +
      "_" +
      Date.now();


    const transactionRef =
      doc(
        db,
        "transactions",
        transactionId
      );


    await runTransaction(
      db,
      async (tx) => {

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


        const currentBalance =
          Number(
            userData.balance ?? 0
          );


        // -------------------------------
        // CHECK BALANCE
        // -------------------------------

        if (
          currentBalance < price
        ) {

          throw new Error(
            "Insufficient balance. Your balance is " +
            currentBalance.toFixed(2) +
            " ETB."
          );

        }


        // -------------------------------
        // NEW BALANCE
        // -------------------------------

        const newBalance =
          currentBalance - price;


        // -------------------------------
        // VIP DATA
        // -------------------------------

        const vipData = {

          active:
            true,

          level:
            level,

          price:
            price,

          dailyIncome:
            dailyIncome,

          activatedAt:
            serverTimestamp(),

          lastClaimDate:
            null,

          lastClaimAt:
            null

        };


        // -------------------------------
        // UPDATE USER
        // -------------------------------

        tx.update(
          userRef,
          {

            balance:
              newBalance,

            vip:
              vipData

          }
        );


        // -------------------------------
        // HISTORY
        // -------------------------------

        tx.set(
          transactionRef,
          {

            uid:
              currentUser.uid,

            userId:
              currentUser.uid,

            type:
              "VIP Purchase",

            title:
              "VIP " + level + " Purchase",

            level:
              level,

            amount:
              -price,

            status:
              "Completed",

            description:
              "VIP " +
              level +
              " purchased",

            balanceBefore:
              currentBalance,

            balanceAfter:
              newBalance,

            createdAt:
              serverTimestamp()

          }
        );

      }
    );


    alert(
      "✅ VIP " +
      level +
      " activated successfully."
    );


    window.location.replace(
      "dashboard.html"
    );


  } catch (error) {

    console.error(
      "VIP PURCHASE ERROR:",
      error
    );


    alert(
      "❌ " +
      (
        error.message ||
        "VIP purchase failed."
      )
    );

  }

}


// ==========================================
// MAKE FUNCTION AVAILABLE TO HTML
// ==========================================

window.buyVip =
  buyVip;


// ==========================================
// CLAIM DAILY VIP INCOME
// ==========================================

if (claimVipBtn) {

  claimVipBtn.addEventListener(
    "click",
    async () => {

      if (!currentUser) {

        vipMessage.textContent =
          "❌ Please login first.";

        return;
      }


      claimVipBtn.disabled =
        true;


      vipMessage.textContent =
        "⏳ Checking VIP income...";


      try {

        const userRef =
          doc(
            db,
            "users",
            currentUser.uid
          );


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


        const transactionId =
          currentUser.uid +
          "_vip_income_" +
          today;


        const transactionRef =
          doc(
            db,
            "transactions",
            transactionId
          );


        let claimedIncome = 0;


        await runTransaction(
          db,
          async (tx) => {

            // -------------------------------
            // GET USER
            // -------------------------------

            const userSnap =
              await tx.get(
                userRef
              );


            if (!userSnap.exists()) {

              throw new Error(
                "User profile not found."
              );

            }


            const data =
              userSnap.data();


            // -------------------------------
            // VIP CHECK
            // -------------------------------

            if (
              !data.vip ||
              data.vip.active !== true
            ) {

              throw new Error(
                "No active VIP plan."
              );

            }


            const income =
              Number(
                data.vip.dailyIncome ?? 0
              );


            if (
              !Number.isFinite(income) ||
              income <= 0
            ) {

              throw new Error(
                "Invalid VIP daily income."
              );

            }


            // -------------------------------
            // CHECK TODAY
            // -------------------------------

            if (
              data.vip.lastClaimDate ===
              today
            ) {

              throw new Error(
                "You already claimed today's VIP income."
              );

            }


            // -------------------------------
            // BALANCE
            // -------------------------------

            const currentBalance =
              Number(
                data.balance ?? 0
              );


            const newBalance =
              currentBalance +
              income;


            claimedIncome =
              income;


            // -------------------------------
            // UPDATE USER
            // -------------------------------

            tx.update(
              userRef,
              {

                balance:
                  newBalance,

                "vip.lastClaimDate":
                  today,

                "vip.lastClaimAt":
                  serverTimestamp()

              }
            );


            // -------------------------------
            // HISTORY
            // -------------------------------

            tx.set(
              transactionRef,
              {

                uid:
                  currentUser.uid,

                userId:
                  currentUser.uid,

                type:
                  "VIP Daily Income",

                title:
                  "VIP Daily Income",

                amount:
                  income,

                status:
                  "Completed",

                description:
                  "Daily income from VIP " +
                  data.vip.level,

                vipLevel:
                  data.vip.level,

                incomeDate:
                  today,

                balanceBefore:
                  currentBalance,

                balanceAfter:
                  newBalance,

                createdAt:
                  serverTimestamp()

              }
            );

          }
        );


        // ==================================
        // SUCCESS
        // ==================================

        vipMessage.textContent =
          "✅ +" +
          claimedIncome.toFixed(2) +
          " ETB added to your wallet.";


        claimVipBtn.textContent =
          "✅ Income Claimed Today";


      } catch (error) {

        console.error(
          "VIP INCOME ERROR:",
          error
        );


        if (
          error.message ===
          "You already claimed today's VIP income."
        ) {

          vipMessage.textContent =
            "⚠️ You already claimed today's VIP income.";

          claimVipBtn.textContent =
            "Already Claimed";

        }

        else if (
          error.message ===
          "No active VIP plan."
        ) {

          vipMessage.textContent =
            "❌ No active VIP plan.";

        }

        else if (
          error.code ===
          "permission-denied"
        ) {

          vipMessage.textContent =
            "❌ Firestore Rules blocked VIP income.";

        }

        else {

          vipMessage.textContent =
            "❌ " +
            (
              error.message ||
              "VIP income failed."
            );

        }


        claimVipBtn.disabled =
          false;

      }

    }
  );

}