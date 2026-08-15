import { db, auth } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


const taskList =
  document.getElementById("taskList");


onAuthStateChanged(auth, async (user) => {

  // ==========================================
  // CHECK LOGIN
  // ==========================================

  if (!user) {

    taskList.innerHTML =
      "<p>Please login first.</p>";

    return;
  }


  try {

    // ==========================================
    // LOAD TASKS
    // ==========================================

    const snapshot =
      await getDocs(
        collection(db, "tasks")
      );


    taskList.innerHTML = "";


    if (snapshot.empty) {

      taskList.innerHTML =
        "<p>No tasks available.</p>";

      return;
    }


    // ==========================================
    // DISPLAY TASKS
    // ==========================================

    for (const taskDoc of snapshot.docs) {

      const data =
        taskDoc.data();


      const taskId =
        taskDoc.id;


      const title =
        String(
          data.title ?? "Watch ads"
        );


      const description =
        String(
          data.description ??
          "watch one advertisement"
        );


      const reward =
        Number(
          data.reward ?? 0
        );


      // ========================================
      // COMPLETION REFERENCE
      // ========================================

      const completionId =
        user.uid +
        "_" +
        taskId;


      const completionRef =
        doc(
          db,
          "taskCompletions",
          completionId
        );


      // ========================================
      // CHECK IF ALREADY COMPLETED
      // ========================================

      let alreadyCompleted = false;


      try {

        const completionSnap =
          await getDoc(
            completionRef
          );


        alreadyCompleted =
          completionSnap.exists();


      } catch (error) {

        console.error(
          "Completion check error:",
          error
        );

      }


      // ========================================
      // CREATE CARD
      // ========================================

      const card =
        document.createElement("div");


      card.className =
        "card";


      card.innerHTML =

        "<h2>" +
        title +
        "</h2>" +

        "<p>" +
        description +
        "</p>" +

        "<h3>💰 Reward: " +
        reward +
        " ETB</h3>" +

        "<button " +
        "type='button' " +
        "class='completeTaskBtn'>" +
        (
          alreadyCompleted
            ? "✅ Completed"
            : "Complete Task"
        ) +
        "</button>" +

        "<p class='taskMessage'>" +
        (
          alreadyCompleted
            ? "You already completed this task."
            : ""
        ) +
        "</p>";


      taskList.appendChild(card);


      const button =
        card.querySelector(
          ".completeTaskBtn"
        );


      const message =
        card.querySelector(
          ".taskMessage"
        );


      // ========================================
      // ALREADY COMPLETED
      // ========================================

      if (alreadyCompleted) {

        button.disabled = true;

        return;
      }


      // ========================================
      // COMPLETE TASK
      // ========================================

      button.addEventListener(
        "click",
        async () => {

          const currentUser =
            auth.currentUser;


          if (!currentUser) {

            message.textContent =
              "❌ Please login first.";

            return;
          }


          if (
            !Number.isFinite(reward) ||
            reward <= 0
          ) {

            message.textContent =
              "❌ Invalid task reward.";

            return;
          }


          button.disabled = true;

          message.textContent =
            "Completing task...";


          try {

            // ==================================
            // USER
            // ==================================

            const userRef =
              doc(
                db,
                "users",
                currentUser.uid
              );


            const userSnap =
              await getDoc(
                userRef
              );


            if (!userSnap.exists()) {

              throw new Error(
                "User data not found."
              );
            }


            const userData =
              userSnap.data();


            const currentBalance =
              Number(
                userData.balance ?? 0
              );


            const newBalance =
              currentBalance +
              reward;


            // ==================================
            // IDS
            // ==================================

            const completionId =
              currentUser.uid +
              "_" +
              taskId;


            const transactionId =
              currentUser.uid +
              "_task_" +
              taskId;


            const completionRef =
              doc(
                db,
                "taskCompletions",
                completionId
              );


            const transactionRef =
              doc(
                db,
                "transactions",
                transactionId
              );


            // ==================================
            // CHECK DUPLICATE AGAIN
            // ==================================

            const completionSnap =
              await getDoc(
                completionRef
              );


            if (completionSnap.exists()) {

              message.textContent =
                "⚠️ You already completed this task.";

              button.textContent =
                "✅ Completed";

              button.disabled =
                true;

              return;
            }


            // ==================================
            // BATCH
            // ==================================

            const batch =
              writeBatch(db);


            // ==================================
            // UPDATE USER
            // ==================================

            batch.update(
              userRef,
              {

                balance:
                  newBalance,

                lastTaskId:
                  taskId,

                lastTaskReward:
                  reward

              }
            );


            // ==================================
            // TASK COMPLETION
            // ==================================

            batch.set(
              completionRef,
              {

                uid:
                  currentUser.uid,

                taskId:
                  taskId,

                title:
                  title,

                reward:
                  reward,

                balanceBefore:
                  currentBalance,

                balanceAfter:
                  newBalance,

                completedAt:
                  serverTimestamp()

              }
            );


            // ==================================
            // TRANSACTION
            // ==================================

            batch.set(
              transactionRef,
              {

                uid:
                  currentUser.uid,

                type:
                  "task_reward",

                taskId:
                  taskId,

                title:
                  title,

                amount:
                  reward,

                balanceBefore:
                  currentBalance,

                balanceAfter:
                  newBalance,

                createdAt:
                  serverTimestamp()

              }
            );


            // ==================================
            // COMMIT
            // ==================================

            await batch.commit();


            // ==================================
            // SUCCESS
            // ==================================

            message.textContent =
              "✅ Task completed! +" +
              reward +
              " ETB";


            button.textContent =
              "✅ Completed";


            button.disabled =
              true;


          } catch (error) {

            console.error(
              "COMPLETE TASK ERROR:",
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


            if (
              error.code ===
              "permission-denied"
            ) {

              message.textContent =
                "❌ Firestore Rules blocked the task.";

            } else {

              message.textContent =
                "❌ " +
                (
                  error.message ||
                  "Task could not be completed."
                );
            }


            button.disabled =
              false;
          }

        }
      );

    }


  } catch (error) {

    console.error(
      "TASK LOAD ERROR:",
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


    if (
      error.code ===
      "permission-denied"
    ) {

      taskList.innerHTML =
        "<p>❌ Permission denied. You cannot read tasks.</p>";

    } else {

      taskList.innerHTML =
        "<p>❌ Failed to load tasks: " +
        (
          error.message ||
          "Unknown error"
        ) +
        "</p>";
    }

  }

});