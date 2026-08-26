import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ==========================================
// HISTORY TABLE
// ==========================================

const historyTable =
  document.getElementById("historyTable");


// ==========================================
// LOGIN CHECK
// ==========================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    window.location.replace("login.html");

    return;
  }


  if (!historyTable) {

    console.error(
      "historyTable element not found."
    );

    return;
  }


  historyTable.innerHTML = `
    <tr>
      <td colspan="4">
        ⏳ Loading history...
      </td>
    </tr>
  `;


  try {

    // ======================================
    // GET TRANSACTIONS BY UID
    // ======================================

    const uidQuery =
      query(
        collection(db, "transactions"),
        where("uid", "==", user.uid)
      );


    const uidSnapshot =
      await getDocs(uidQuery);


    // ======================================
    // GET TRANSACTIONS BY USER ID
    // ======================================

    const userIdQuery =
      query(
        collection(db, "transactions"),
        where("userId", "==", user.uid)
      );


    const userIdSnapshot =
      await getDocs(userIdQuery);


    // ======================================
    // COMBINE WITHOUT DUPLICATES
    // ======================================

    const transactions =
      new Map();


    uidSnapshot.forEach((item) => {

      transactions.set(
        item.id,
        item
      );

    });


    userIdSnapshot.forEach((item) => {

      transactions.set(
        item.id,
        item
      );

    });


    // ======================================
    // NO DATA
    // ======================================

    if (transactions.size === 0) {

      historyTable.innerHTML = `
        <tr>
          <td colspan="4">
            No transaction history yet.
          </td>
        </tr>
      `;

      return;
    }


    // ======================================
    // ARRAY
    // ======================================

    const transactionArray =
      Array.from(
        transactions.values()
      );


    // ======================================
    // NEWEST FIRST
    // ======================================

    transactionArray.sort((a, b) => {

      const dataA =
        a.data();

      const dataB =
        b.data();


      const dateA =
        dataA.createdAt;

      const dateB =
        dataB.createdAt;


      const timeA =
        dateA &&
        typeof dateA.toMillis === "function"
          ? dateA.toMillis()
          : 0;


      const timeB =
        dateB &&
        typeof dateB.toMillis === "function"
          ? dateB.toMillis()
          : 0;


      return timeB - timeA;

    });


    // ======================================
    // CLEAR TABLE
    // ======================================

    historyTable.innerHTML = "";


    // ======================================
    // DISPLAY TRANSACTIONS
    // ======================================

    transactionArray.forEach(
      (transactionDoc) => {

        const data =
          transactionDoc.data();


        // ====================================
        // GET ALL POSSIBLE TYPE FIELDS
        // ====================================

        const rawType =
          String(
            data.type ||
            data.title ||
            data.transactionType ||
            data.category ||
            data.description ||
            ""
          );


        // ====================================
        // NORMALIZE
        // ====================================

        const lowerType =
          rawType
            .trim()
            .toLowerCase()
            .replace(/-/g, "_");


        let type =
          "💳 Transaction";


        // ====================================
        // DEPOSIT
        // ====================================

        if (
          lowerType.includes("deposit")
        ) {

          type =
            "💳 Deposit";

        }


        // ====================================
        // WITHDRAWAL REFUND
        // ====================================

        else if (
          lowerType.includes("withdrawal") &&
          (
            lowerType.includes("refund") ||
            lowerType.includes("refunded")
          )
        ) {

          type =
            "↩️ Withdrawal Refunded";

        }


        // ====================================
        // WITHDRAWAL
        // ====================================

        else if (
          lowerType.includes("withdrawal") ||
          lowerType === "withdraw"
        ) {

          type =
            "💸 Withdrawal";

        }


        // ====================================
        // TASK REWARD
        // ====================================

        else if (
          lowerType.includes("task_reward") ||
          lowerType.includes("task reward") ||
          lowerType === "task"
        ) {

          type =
            "🎯 Task Reward";

        }


        // ====================================
        // DAILY BONUS
        // ====================================

        else if (
          lowerType.includes("daily_bonus") ||
          lowerType.includes("daily bonus") ||
          lowerType === "daily"
        ) {

          type =
            "🎁 Daily Bonus";

        }


        // ====================================
        // REFERRAL / INVITE BONUS
        // ====================================

        else if (

          lowerType.includes("referral") ||

          lowerType.includes("referred") ||

          lowerType.includes("referrer") ||

          lowerType.includes("invite") ||

          lowerType.includes("invitation") ||

          lowerType.includes("friend_bonus") ||

          lowerType.includes("friend bonus") ||

          lowerType.includes("friend_reward") ||

          lowerType.includes("friend reward") ||

          lowerType.includes("invite_bonus") ||

          lowerType.includes("invite bonus") ||

          lowerType.includes("invite_reward") ||

          lowerType.includes("invite reward")

        ) {

          type =
            "👥 Referral Bonus";

        }


        // ====================================
        // INVESTMENT
        // ====================================

        else if (
          lowerType.includes("investment") &&
          !lowerType.includes("daily")
        ) {

          type =
            "💰 Investment";

        }


        // ====================================
        // INVESTMENT DAILY RETURN
        // ====================================

        else if (
          lowerType.includes("investment_daily_return") ||
          lowerType.includes("investment daily return")
        ) {

          type =
            "📈 Investment Daily Return";

        }


        // ====================================
        // VIP PURCHASE
        // ====================================

        else if (
          lowerType.includes("vip_purchase") ||
          lowerType.includes("vip purchase")
        ) {

          type =
            "💎 VIP Purchase";

        }


        // ====================================
        // VIP DAILY INCOME
        // ====================================

        else if (
          lowerType.includes("vip_daily_income") ||
          lowerType.includes("vip daily income")
        ) {

          type =
            "💎 VIP Daily Income";

        }


        // ====================================
        // GENERAL BONUS
        // ====================================

        else if (
          lowerType.includes("bonus") ||
          lowerType.includes("reward")
        ) {

          type =
            "🎁 Bonus";

        }


        // ====================================
        // AMOUNT
        // ====================================

        const amount =
          Number(
            data.amount ?? 0
          );


        const absoluteAmount =
          Math.abs(amount);


        const sign =
          amount < 0
            ? "-"
            : "+";


        const displayAmount =
          absoluteAmount.toFixed(2);


        // ====================================
        // STATUS
        // ====================================

        const status =
          String(
            data.status ||
            "Completed"
          );


        // ====================================
        // DATE
        // ====================================

        let dateText =
          "N/A";


        if (
          data.createdAt &&
          typeof data.createdAt.toDate ===
            "function"
        ) {

          dateText =
            data.createdAt
              .toDate()
              .toLocaleString();

        }


        // ====================================
        // CREATE ROW
        // ====================================

        const row =
          document.createElement("tr");


        row.innerHTML = `

          <td>
            ${type}
          </td>

          <td>
            ${sign}${displayAmount} ETB
          </td>

          <td>
            ${status}
          </td>

          <td>
            ${dateText}
          </td>

        `;


        historyTable.appendChild(row);

      }
    );


  } catch (error) {

    console.error(
      "HISTORY ERROR:",
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


    historyTable.innerHTML = `
      <tr>
        <td colspan="4">
          ❌ ${error.message}
        </td>
      </tr>
    `;

  }

});