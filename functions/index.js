const { onCall, HttpsError } =
  require("firebase-functions/v2/https");

const {
  onRequest
} = require("firebase-functions/v2/https");

const admin =
  require("firebase-admin");

admin.initializeApp();

const db =
  admin.firestore();


// ==========================================
// SETTINGS
// ==========================================

const REFERRAL_BONUS = 20;


// ==========================================
// REGISTER USER PROFILE
// ==========================================

exports.createUserProfile =
  onCall(async (request) => {

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Please login first."
      );
    }

    const uid =
      request.auth.uid;

    const name =
      String(
        request.data?.name || ""
      ).trim();

    const email =
      String(
        request.data?.email ||
        request.auth.token.email ||
        ""
      ).trim().toLowerCase();

    const referralCode =
      String(
        request.data?.referralCode || ""
      )
        .trim()
        .toUpperCase();


    if (!name) {
      throw new HttpsError(
        "invalid-argument",
        "Name is required."
      );
    }


    if (!email) {
      throw new HttpsError(
        "invalid-argument",
        "Email is required."
      );
    }


    const userRef =
      db.collection("users").doc(uid);


    // ========================================
    // REFERRAL CODE
    // ========================================

    const myReferralCode =
      uid
        .substring(0, 8)
        .toUpperCase();


    // ========================================
    // FIND INVITER
    // ========================================

    let inviterId = null;


    if (referralCode) {

      const snapshot =
        await db
          .collection("users")
          .where(
            "referralCode",
            "==",
            referralCode
          )
          .limit(1)
          .get();


      if (!snapshot.empty) {

        const inviterDoc =
          snapshot.docs[0];

        if (
          inviterDoc.id !== uid
        ) {
          inviterId =
            inviterDoc.id;
        }

      }

    }


    // ========================================
    // TRANSACTION
    // ========================================

    const result =
      await db.runTransaction(
        async (tx) => {

          const existing =
            await tx.get(userRef);


          // ----------------------------------
          // ALREADY EXISTS
          // ----------------------------------

          if (existing.exists) {

            return {
              created: false,
              referralBonus: false
            };

          }


          // ----------------------------------
          // NORMAL REGISTRATION
          // ----------------------------------

          if (!inviterId) {

            tx.set(
              userRef,
              {
                name,
                email,

                balance: 0,

                referralCode:
                  myReferralCode,

                referredBy:
                  null,

                role:
                  "user",

                createdAt:
                  admin.firestore.FieldValue.serverTimestamp()
              }
            );


            return {
              created: true,
              referralBonus: false
            };

          }


          // ----------------------------------
          // INVITER
          // ----------------------------------

          const inviterRef =
            db
              .collection("users")
              .doc(inviterId);


          const inviterSnap =
            await tx.get(inviterRef);


          if (
            !inviterSnap.exists
          ) {

            throw new HttpsError(
              "not-found",
              "Inviter account not found."
            );

          }


          const inviterData =
            inviterSnap.data();


          const oldBalance =
            Number(
              inviterData.balance || 0
            );


          if (
            !Number.isFinite(
              oldBalance
            )
          ) {

            throw new HttpsError(
              "failed-precondition",
              "Invalid inviter balance."
            );

          }


          const newBalance =
            oldBalance +
            REFERRAL_BONUS;


          // ----------------------------------
          // UNIQUE TRANSACTION
          // ----------------------------------

          const transactionId =
            `${uid}_referral_bonus`;


          const transactionRef =
            db
              .collection("transactions")
              .doc(transactionId);


          const existingTransaction =
            await tx.get(
              transactionRef
            );


          if (
            existingTransaction.exists
          ) {

            throw new HttpsError(
              "already-exists",
              "Referral bonus already processed."
            );

          }


          // ----------------------------------
          // UPDATE INVITER
          // ----------------------------------

          tx.update(
            inviterRef,
            {
              balance:
                newBalance,

              lastReferralBonus:
                REFERRAL_BONUS,

              lastReferralAt:
                admin.firestore.FieldValue.serverTimestamp()
            }
          );


          // ----------------------------------
          // CREATE NEW USER
          // ----------------------------------

          tx.set(
            userRef,
            {
              name,
              email,

              balance: 0,

              referralCode:
                myReferralCode,

              referredBy:
                inviterId,

              role:
                "user",

              createdAt:
                admin.firestore.FieldValue.serverTimestamp()
            }
          );


          // ----------------------------------
          // CREATE TRANSACTION
          // ----------------------------------

          tx.set(
            transactionRef,
            {
              uid:
                inviterId,

              userId:
                inviterId,

              type:
                "referral_bonus",

              title:
                "👥 Referral Bonus",

              description:
                "Referral bonus for inviting a new user.",

              amount:
                REFERRAL_BONUS,

              status:
                "Completed",

              referredUserId:
                uid,

              referredUserEmail:
                email,

              referralCode:
                referralCode,

              balanceBefore:
                oldBalance,

              balanceAfter:
                newBalance,

              createdAt:
                admin.firestore.FieldValue.serverTimestamp()
            }
          );


          return {
            created: true,
            referralBonus: true
          };

        }
      );


    return result;

  });


// ==========================================
// COMPLETE TASK
// ==========================================

exports.completeTask =
  onCall(async (request) => {

    if (!request.auth) {

      throw new HttpsError(
        "unauthenticated",
        "Please login first."
      );

    }


    const uid =
      request.auth.uid;


    const taskId =
      String(
        request.data?.taskId || ""
      ).trim();


    if (!taskId) {

      throw new HttpsError(
        "invalid-argument",
        "Task ID is required."
      );

    }


    const taskRef =
      db
        .collection("tasks")
        .doc(taskId);


    const userRef =
      db
        .collection("users")
        .doc(uid);


    const completionId =
      `${uid}_${taskId}`;


    const completionRef =
      db
        .collection("taskCompletions")
        .doc(completionId);


    const transactionId =
      `${uid}_task_${taskId}`;


    const transactionRef =
      db
        .collection("transactions")
        .doc(transactionId);


    const result =
      await db.runTransaction(
        async (tx) => {

          // =================================
          // READ
          // =================================

          const taskSnap =
            await tx.get(taskRef);


          if (
            !taskSnap.exists
          ) {

            throw new HttpsError(
              "not-found",
              "Task not found."
            );

          }


          const userSnap =
            await tx.get(userRef);


          if (
            !userSnap.exists
          ) {

            throw new HttpsError(
              "not-found",
              "User account not found."
            );

          }


          const completionSnap =
            await tx.get(
              completionRef
            );


          if (
            completionSnap.exists
          ) {

            throw new HttpsError(
              "already-exists",
              "You already completed this task."
            );

          }


          // =================================
          // TASK DATA
          // =================================

          const task =
            taskSnap.data();


          const reward =
            Number(
              task.reward || 0
            );


          if (
            !Number.isFinite(reward) ||
            reward <= 0
          ) {

            throw new HttpsError(
              "failed-precondition",
              "Invalid task reward."
            );

          }


          // =================================
          // USER BALANCE
          // =================================

          const user =
            userSnap.data();


          const oldBalance =
            Number(
              user.balance || 0
            );


          if (
            !Number.isFinite(oldBalance)
          ) {

            throw new HttpsError(
              "failed-precondition",
              "Invalid user balance."
            );

          }


          const newBalance =
            oldBalance +
            reward;


          // =================================
          // UPDATE BALANCE
          // =================================

          tx.update(
            userRef,
            {
              balance:
                newBalance,

              lastTaskReward:
                reward,

              lastTaskAt:
                admin.firestore.FieldValue.serverTimestamp()
            }
          );


          // =================================
          // COMPLETION
          // =================================

          tx.set(
            completionRef,
            {
              uid,

              taskId,

              reward,

              title:
                String(
                  task.title || "Task"
                ),

              status:
                "Completed",

              createdAt:
                admin.firestore.FieldValue.serverTimestamp()
            }
          );


          // =================================
          // TRANSACTION
          // =================================

          tx.set(
            transactionRef,
            {
              uid,

              userId:
                uid,

              type:
                "task_reward",

              title:
                "📌 Task Reward",

              description:
                String(
                  task.title ||
                  "Completed task"
                ),

              amount:
                reward,

              status:
                "Completed",

              taskId,

              balanceBefore:
                oldBalance,

              balanceAfter:
                newBalance,

              createdAt:
                admin.firestore.FieldValue.serverTimestamp()
            }
          );


          return {
            reward,
            newBalance
          };

        }
      );


    return {
      success: true,

      reward:
        result.reward,

      balance:
        result.newBalance
    };

  });


// ==========================================
// HEALTH CHECK
// ==========================================

exports.health =
  onRequest(
    (req, res) => {

      res.status(200).json({
        success: true,
        message:
          "Money Earn Ethiopia Functions are running."
      });

    }
  );
