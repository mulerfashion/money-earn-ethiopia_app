import { db, auth } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";


// ==========================================
// ELEMENT
// ==========================================

const taskList =
  document.getElementById("taskList");


// ==========================================
// FIREBASE FUNCTIONS
// ==========================================

const functions =
  getFunctions();

const completeTask =
  httpsCallable(
    functions,
    "completeTask"
  );


// ==========================================
// LOGIN
// ==========================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      if (taskList) {

        taskList.innerHTML =
          "<p>❌ Please login first.</p>";

      }

      return;
    }


    if (!taskList) {

      console.error(
        "taskList element not found."
      );

      return;
    }


    taskList.innerHTML =
      "<p>⏳ Loading jobs...</p>";


    try {

      // ======================================
      // LOAD TASKS
      // ======================================

      const snapshot =
        await getDocs(
          collection(
            db,
            "tasks"
          )
        );


      taskList.innerHTML =
        "";


      if (snapshot.empty) {

        taskList.innerHTML =
          "<p>❌ No tasks available.</p>";

        return;
      }


      // ======================================
      // SORT JOBS
      // ======================================

      const tasks =
        snapshot.docs.sort(
          (a, b) => {

            const aData =
              a.data();

            const bData =
              b.data();


            const aNumber =
              Number(
                aData.jobNumber ??
                aData.order ??
                999
              );


            const bNumber =
              Number(
                bData.jobNumber ??
                bData.order ??
                999
              );


            return (
              aNumber -
              bNumber
            );

          }
        );


      // ======================================
      // DISPLAY JOBS
      // ======================================

      for (
        const taskDoc of tasks
      ) {

        const data =
          taskDoc.data();


        const taskId =
          taskDoc.id;


        const title =
          String(
            data.title ??
            "Job"
          );


        const description =
          String(
            data.description ??
            "Complete this job."
          );


        const reward =
          Number(
            data.reward ?? 0
          );


        // ====================================
        // VALIDATE REWARD
        // ====================================

        if (
          !Number.isFinite(reward) ||
          reward <= 0
        ) {

          console.warn(
            "Invalid task reward:",
            taskId
          );

          continue;
        }


        // ====================================
        // COMPLETION ID
        // ====================================

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


        // ====================================
        // CHECK COMPLETED
        // ====================================

        let completed =
          false;


        try {

          const completionSnap =
            await getDoc(
              completionRef
            );


          completed =
            completionSnap.exists();

        } catch (error) {

          console.error(
            "Completion check error:",
            error
          );

        }


        // ====================================
        // CREATE CARD
        // ====================================

        const card =
          document.createElement(
            "div"
          );


        card.className =
          "card task-card";


        card.innerHTML = `

          <h2 class="task-title">
            📌 ${escapeHTML(title)}
          </h2>

          <p class="task-description">
            ${escapeHTML(description)}
          </p>

          <h3 class="task-reward">
            💰 Reward:
            ${reward.toFixed(2)} ETB
          </h3>

          <button
            type="button"
            class="completeTaskBtn"
            ${completed ? "disabled" : ""}
          >
            ${
              completed
                ? "✅ Completed"
                : "Complete Job"
            }
          </button>

          <p class="taskMessage">
            ${
              completed
                ? "You already completed this job."
                : ""
            }
          </p>

        `;


        taskList.appendChild(
          card
        );


        const button =
          card.querySelector(
            ".completeTaskBtn"
          );


        const message =
          card.querySelector(
            ".taskMessage"
          );


        // ====================================
        // ALREADY COMPLETED
        // ====================================

        if (completed) {

          continue;
        }


        // ====================================
        // COMPLETE JOB
        // ====================================

        button.addEventListener(
          "click",
          async () => {

            button.disabled =
              true;


            message.textContent =
              "⏳ Completing job...";


            try {

              const currentUser =
                auth.currentUser;


              if (!currentUser) {

                throw new Error(
                  "Please login first."
                );

              }


              // =================================
              // REFRESH LOGIN TOKEN
              // =================================

              await currentUser.getIdToken(
                true
              );


              // =================================
              // FINAL DUPLICATE CHECK
              // =================================

              const finalCheck =
                await getDoc(
                  completionRef
                );


              if (
                finalCheck.exists()
              ) {

                button.textContent =
                  "✅ Completed";

                message.textContent =
                  "⚠️ You already completed this job.";

                return;
              }


              // =================================
              // CALL CLOUD FUNCTION
              // =================================

              message.textContent =
                "⏳ Verifying job...";


              const result =
                await completeTask({
                  taskId:
                    taskId
                });


              const resultData =
                result.data || {};


              // =================================
              // CHECK FUNCTION RESULT
              // =================================

              if (
                resultData.success === false
              ) {

                throw new Error(
                  resultData.message ||
                  "Job could not be completed."
                );

              }


              // =================================
              // GET RESULT
              // =================================

              const earned =
                Number(
                  resultData.reward ??
                  reward
                );


              const balance =
                Number(
                  resultData.balance ??
                  0
                );


              // =================================
              // SUCCESS
              // =================================

              button.textContent =
                "✅ Completed";


              button.disabled =
                true;


              message.textContent =
                "✅ Job completed! +" +
                earned.toFixed(2) +
                " ETB";


              // =================================
              // OPTIONAL BALANCE MESSAGE
              // =================================

              if (
                Number.isFinite(balance)
              ) {

                message.textContent +=
                  " | Balance: " +
                  balance.toFixed(2) +
                  " ETB";

              }


            } catch (error) {

              console.error(
                "COMPLETE TASK ERROR:",
                error
              );


              // =================================
              // FIREBASE ERROR HANDLING
              // =================================

              let errorMessage =
                "Job could not be completed.";


              if (
                error.code ===
                "functions/already-exists"
              ) {

                errorMessage =
                  "⚠️ You already completed this job.";

                button.textContent =
                  "✅ Completed";

              }

              else if (
                error.code ===
                "functions/unauthenticated"
              ) {

                errorMessage =
                  "❌ Please login again.";

              }

              else if (
                error.code ===
                "functions/not-found"
              ) {

                errorMessage =
                  "❌ Job was not found.";

              }

              else if (
                error.code ===
                "functions/failed-precondition"
              ) {

                errorMessage =
                  "❌ The job reward is invalid.";

              }

              else if (
                error.code ===
                "functions/permission-denied"
              ) {

                errorMessage =
                  "❌ Permission denied.";

              }

              else if (
                error.code ===
                "functions/unavailable"
              ) {

                errorMessage =
                  "❌ Server is unavailable. Please try again.";

              }

              else if (
                error.message
              ) {

                errorMessage =
                  "❌ " +
                  error.message;

              }


              message.textContent =
                errorMessage;


              // If it wasn't actually completed,
              // allow the user to try again.

              if (
                error.code !==
                "functions/already-exists"
              ) {

                button.disabled =
                  false;

              }

            }

          }
        );

      }


    } catch (error) {

      console.error(
        "TASK LOAD ERROR:",
        error
      );


      if (
        error.code ===
        "permission-denied"
      ) {

        taskList.innerHTML =
          "<p>❌ Permission denied.</p>";

      }

      else {

        taskList.innerHTML =
          "<p>❌ Failed to load jobs: " +
          escapeHTML(
            error.message ||
            "Unknown error"
          ) +
          "</p>";

      }

    }

  }
);


// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHTML(
  value
) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}