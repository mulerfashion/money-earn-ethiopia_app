const { onCall, HttpsError } =
require("firebase-functions/v2/https");

const { onDocumentCreated } =
require("firebase-functions/v2/firestore");

const admin =
require("firebase-admin");

admin.initializeApp();

const db =
admin.firestore();


// ===============================
// COMPLETE TASK
// ===============================

exports.completeTask =
onCall(async (request) => {

  const user =
    request.auth;

  if (!user) {
    throw new HttpsError(
      "unauthenticated",
      "Please login first."
    );
  }


  const uid =
    user.uid;


  const taskId =
    request.data.taskId;


  if (!taskId) {
    throw new HttpsError(
      "invalid-argument",
      "Task ID missing."
    );
  }


  const completionId =
    uid + "_" + taskId;


  const completionRef =
    db.collection("taskCompletions")
      .doc(completionId);


  const userRef =
    db.collection("users")
      .doc(uid);


  const taskRef =
    db.collection("tasks")
      .doc(taskId);



  await db.runTransaction(
    async (tx)=>{


      const completionSnap =
      await tx.get(completionRef);


      if (completionSnap.exists) {

        throw new Error(
          "ALREADY_COMPLETED"
        );

      }


      const taskSnap =
      await tx.get(taskRef);


      if (!taskSnap.exists) {

        throw new Error(
          "TASK_NOT_FOUND"
        );

      }


      const userSnap =
      await tx.get(userRef);


      const reward =
      Number(
        taskSnap.data().reward || 0
      );


      const oldBalance =
      Number(
        userSnap.data().balance || 0
      );


      const newBalance =
      oldBalance + reward;



      tx.update(
        userRef,
        {
          balance:newBalance
        }
      );



      tx.set(
        completionRef,
        {
          uid:uid,
          taskId:taskId,
          reward:reward,
          createdAt:
          admin.firestore.FieldValue.serverTimestamp()
        }
      );



      tx.set(
        db.collection("transactions").doc(),
        {
          uid:uid,
          type:"task_reward",
          title:"Task Reward",
          amount:reward,
          status:"Completed",
          balanceBefore:oldBalance,
          balanceAfter:newBalance,
          createdAt:
          admin.firestore.FieldValue.serverTimestamp()
        }
      );


    }
  );


  return {
    success:true,
    message:"Task completed"
  };

});




// ===============================
// REFERRAL BONUS
// ===============================

exports.referralBonus =
onDocumentCreated(
"users/{uid}",
async(event)=>{


 const user =
 event.data.data();


 const inviter =
 user.referredBy;


 if(!inviter){
   return;
 }


 const bonus = 20;


 const inviterRef =
 db.collection("users")
 .doc(inviter);



 await db.runTransaction(
 async(tx)=>{


 const inviterSnap =
 await tx.get(inviterRef);


 if(!inviterSnap.exists){
   return;
 }


 const balance =
 Number(
 inviterSnap.data().balance || 0
 );


 tx.update(
 inviterRef,
 {
 balance:
 balance + bonus
 }
 );


 tx.set(
 db.collection("transactions").doc(),
 {
 uid:inviter,
 type:"referral_bonus",
 amount:bonus,
 title:"Referral Bonus",
 createdAt:
 admin.firestore.FieldValue.serverTimestamp()
 }
 );


 });


});
