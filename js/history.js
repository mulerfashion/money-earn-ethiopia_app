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
    // GET BY UID
    // ======================================

    const uidQuery =
      query(
        collection(db, "transactions"),
        where("uid", "==", user.uid)
      );


    const uidSnapshot =
      await getDocs(uidQuery);


    // ======================================
    // GET BY USER ID
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

    const transactions = new Map();


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

      const dataA = a.data();
      const dataB = b.data();


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
    // CLEAR
    // ======================================

    historyTable.innerHTML = "";


    // ======================================
    // DISPLAY
    // ======================================

    transactionArray.forEach((transactionDoc) => {

      const data =
        transactionDoc.data();


      // ====================================
      // TYPE
      // ====================================

      const rawType =
        String(
          data.type ||
          data.title ||
          "Transaction"
        );


      const lowerType =
        rawType
          .trim()
          .toLowerCase();


      let type =
        "💳 Transaction";


      // Deposit
      if (
        lowerType === "deposit" ||
        lowerType === "deposit approved"
      ) {

        type =
          "💳 Deposit";

      }


      // Withdrawal
      else if (
        lowerType === "withdrawal"
      ) {

        type =
          "💸 Withdrawal";

      }


      // Withdrawal Refund
      else if (
        lowerType === "withdrawal refunded"
      ) {

        type =
          "↩️ Withdrawal Refunded";

      }


      // Task
      else if (
        lowerType === "task_reward" ||
        lowerType === "task reward"
      ) {

        type =
          "🎯 Task Reward";

      }


      // Daily Bonus
      else if (
        lowerType === "daily_bonus" ||
        lowerType === "daily bonus"
      ) {

        type =
          "🎁 Daily Bonus";

      }


      // Investment Purchase
      else if (
        lowerType === "investment"
      ) {

        type =
          "💰 Investment";

      }


      // Investment Return
      else if (
        lowerType === "investment daily return"
      ) {

        type =
          "📈 Investment Daily Return";

      }


      // VIP Purchase
      else if (
        lowerType === "vip purchase"
      ) {

        type =
          "💎 VIP Purchase";

      }


      // VIP Daily Income
      else if (
        lowerType === "vip daily income"
      ) {

        type =
          "💎 VIP Daily Income";

      }


      // Referral
      else if (
        lowerType === "referral bonus"
      ) {

        type =
          "👥 Referral Bonus";

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


      /*
        IMPORTANT:

        Negative amount = money spent
        Positive amount = money received

        Example:

        Investment       -1000 ETB
        VIP Purchase      -300 ETB
        Deposit          +1000 ETB
        Daily Return      +30 ETB
        Referral Bonus    +20 ETB
      */

      let sign =
        amount < 0
          ? "-"
          : "+";


      // ====================================
      // DISPLAY AMOUNT
      // ====================================

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
        typeof data.createdAt.toDate === "function"
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

    });


  } catch (error) {

    console.error(
      "HISTORY ERROR:",
      error
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