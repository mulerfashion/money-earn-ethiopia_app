const { onCall, HttpsError } =
  require("firebase-functions/v2/https");

const {
  initializeApp
} = require("firebase-admin/app");

const {
  getFirestore,
  FieldValue
} = require("firebase-admin/firestore");

const {
  getAuth
} = require("firebase-admin/auth");


initializeApp();

const db = getFirestore();
const adminAuth = getAuth();


// ==========================================
// SETTINGS
// ==========================================

const REFERRAL_BONUS = 20;


// ==========================================
// HELPER
// ==========================================

function cleanString(value) {
  return String(value || "").trim();
}


// ==========================================
// REGISTER USER + REFERRAL
// ==========================================
//
// Client creates Firebase Auth account first.
// Then this trusted function creates the user
// document and processes referral bonus.
//
// ==========================================

exports.registerUser = onCall(
  async (request) => {

    if (!request.auth) {

      throw new HttpsError(
        "unauthenticated",
        "Please login first."
      );

    }


    const uid =
      request.auth.uid;


    const name =
      cleanString(
        request.data?.name
      );


    const email =
      cleanString(
        request.data?.email
      ).toLowerCase();


    const referralCode =
      cleanString(
        request.data?.referralCode
      ).toUpperCase();


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


    try {

      const result =
        await db.runTransaction(
          async (tx) => {

            // =================================
            // CHECK NEW USER
            // =================================

            const existingUser =
              await tx.get(userRef);


            if (existingUser.exists) {

              return {
                alreadyExists: true,
                referralProcessed: false
              };

            }


            // =================================
            // DEFAULT USER DATA
            // =================================

            let inviterId = null;
            let inviterRef = null;
            let inviterData = null;


            // =================================
            // FIND INVITER
            // =================================

            if (referralCode) {

              const referralSnapshot =
                await db
                  .collection("users")
                  .where(
                    "referralCode",
                    "==",
                    referralCode
                  )
                  .limit(1)
                  .get();


              if (
                !referralSnapshot.empty
              ) {

                const inviterDoc =
                  referralSnapshot.docs[0];


                if (
                  inviterDoc.id !== uid
                ) {

                  inviterId =
                    inviterDoc.id;

                  inviterRef =
                    inviterDoc.ref;

                  inviterData =
                    inviterDoc.data();

                }

              } else {

                throw new HttpsError(
                  "invalid-argument",
                  "Referral code was not found."
                );

              }

            }


            // =================================
            // CREATE USER WITHOUT REFERRAL
            // =================================

            if (!inviterId) {

              tx.set(
                userRef,
                {
                  name: name,

                  email: email,

                  balance: 0,

                  referralCode:
                    uid
                      .substring(0, 8)
                      .toUpperCase(),

                  referredBy: null,

                  role: "user",

                  createdAt:
                    FieldValue.serverTimestamp()
                }
              );


              return {
                alreadyExists: false,
                referralProcessed: false
              };

            }


            // =================================
            // INVITER BALANCE
            // =================================

            const oldBalance =
              Number(
                inviterData?.balance ?? 0
              );


            if (
              !Number.isFinite(oldBalance)
            ) {

              throw new HttpsError(
                "failed-precondition",
                "Inviter balance is invalid."
              );

            }


            const newBalance =
              oldBalance +
              REFERRAL_BONUS;


            // =================================
            // UNIQUE REFERRAL TRANSACTION
            // =================================

            const transactionId =
              `referral_${uid}`;


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
                "Referral bonus has already been processed."
              );

            }


            // =================================
            // UPDATE INVITER
            // =================================

            tx.update(
              inviterRef,
              {
                balance:
                  newBalance,

                lastReferralBonus:
                  REFERRAL_BONUS,

                lastReferralAt:
                  FieldValue.serverTimestamp()
              }
            );


            // =================================
            // CREATE NEW USER
            // =================================

            tx.set(
              userRef,
              {
                name: name,

                email: email,

                balance: 0,

                referralCode:
                  uid
                    .substring(0, 8)
                    .toUpperCase(),

                referredBy:
                  inviterId,

                role: "user",

                createdAt:
                  FieldValue.serverTimestamp()
              }
            );


            // =================================
            // CREATE TRANSACTION
            // =================================

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
                  FieldValue.serverTimestamp()
              }
            );


            return {
              alreadyExists: false,
              referralProcessed: true,
              bonus: REFERRAL_BONUS
            };

          }
        );


      return {
        success: true,
        ...result
      };


    } catch (error) {

      console.error(
        "REGISTER USER ERROR:",
        error
      );


      if (
        error instanceof HttpsError
      ) {

        throw error;

      }


      throw new HttpsError(
        "internal",
        "Could not create user profile."
      );

    }

  }
);


// ==========================================
// COMPLETE TASK
// ==========================================
//
// IMPORTANT:
// Reward is read from Firestore.
// Client cannot choose the reward amount.
//
// ==========================================

exports.completeTask = onCall(
  async (request) => {

    if (!request.auth) {

      throw new HttpsError(
        "unauthenticated",
        "Please login first."
      );

    }


    const uid =
      request.auth.uid;


    const taskId =
      cleanString(
        request.data?.taskId
      );


    if (!taskId) {

      throw new HttpsError(
        "invalid-argument",
        "Task ID is required."
      );

    }


    const userRef =
      db
        .collection("users")
        .doc(uid);


    const taskRef =
      db
        .collection("tasks")
        .doc(taskId);


    const completionId =
      `${uid}_${taskId}`;


    const completionRef =
      db
        .collection("taskCompletions")
        .doc(completionId);


    const transactionRef =
      db
        .collection("transactions")
        .doc(
          `task_${uid}_${taskId}`
        );


    try {

      const result =
        await db.runTransaction(
          async (tx) => {

            // =================================
            // READ ALL REQUIRED DOCUMENTS
            // =================================

            const userSnap =
              await tx.get(userRef);


            const taskSnap =
              await tx.get(taskRef);


            const completionSnap =
              await tx.get(completionRef);


            const transactionSnap =
              await tx.get(transactionRef);


            // =================================
            // CHECK USER
            // =================================

            if (!userSnap.exists) {

              throw new HttpsError(
                "not-found",
                "User profile not found."
              );

            }


            // =================================
            // CHECK TASK
            // =================================

            if (!taskSnap.exists) {

              throw new HttpsError(
                "not-found",
                "Task not found."
              );

            }


            // =================================
            // DUPLICATE CHECK
            // =================================

            if (
              completionSnap.exists ||
              transactionSnap.exists
            ) {

              return {
                alreadyCompleted: true
              };

            }


            const userData =
              userSnap.data();


            const taskData =
              taskSnap.data();


            // =================================
            // OFFICIAL REWARD
            // =================================

            const reward =
              Number(
                taskData.reward ?? 0
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
            // OLD BALANCE
            // =================================

            const oldBalance =
              Number(
                userData.balance ?? 0
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
                  FieldValue.serverTimestamp()
              }
            );


            // =================================
            // CREATE COMPLETION
            // =================================

            tx.create(
              completionRef,
              {
                uid:
                  uid,

                taskId:
                  taskId,

                reward:
                  reward,

                status:
                  "Completed",

                completedAt:
                  FieldValue.serverTimestamp()
              }
            );


            // =================================
            // CREATE TRANSACTION
            // =================================

            tx.create(
              transactionRef,
              {
                uid:
                  uid,

                userId:
                  uid,

                type:
                  "task_reward",

                title:
                  "📋 Task Reward",

                description:
                  taskData.title ||
                  "Completed task",

                amount:
                  reward,

                status:
                  "Completed",

                taskId:
                  taskId,

                balanceBefore:
                  oldBalance,

                balanceAfter:
                  newBalance,

                createdAt:
                  FieldValue.serverTimestamp()
              }
            );


            return {
              alreadyCompleted: false,
              reward: reward,
              newBalance: newBalance
            };

          }
        );


      return {
        success: true,
        ...result
      };


    } catch (error) {

      console.error(
        "COMPLETE TASK ERROR:",
        error
      );


      if (
        error instanceof HttpsError
      ) {

        throw error;

      }


      throw new HttpsError(
        "internal",
        "Could not complete task."
      );

    }

  }
);
