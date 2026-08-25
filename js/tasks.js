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
// FUNCTIONS
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
async (user)=>{


if(!user){

  taskList.innerHTML =
  "<p>❌ Please login first.</p>";

  return;

}


try{


// ==========================================
// LOAD TASKS
// ==========================================

const snapshot =
await getDocs(
 collection(db,"tasks")
);


taskList.innerHTML="";


if(snapshot.empty){

 taskList.innerHTML =
 "<p>❌ No tasks available.</p>";

 return;

}


// ==========================================
// SORT
// ==========================================

const tasks =
snapshot.docs.sort((a,b)=>{


const aData =
a.data();


const bData =
b.data();


return Number(
aData.jobNumber ??
aData.order ??
999
)
-
Number(
bData.jobNumber ??
bData.order ??
999
);


});



// ==========================================
// DISPLAY
// ==========================================

for(
const taskDoc of tasks
){


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
"Complete job"
);


const reward =
Number(
data.reward ?? 0
);



if(
!Number.isFinite(reward) ||
reward <=0
){

continue;

}



const completionRef =
doc(
db,
"taskCompletions",
user.uid+"_"+taskId
);



let completed=false;


const check =
await getDoc(
completionRef
);


completed =
check.exists();



// ==========================================
// CARD
// ==========================================

const card =
document.createElement(
"div"
);


card.className =
"card task-card";


card.innerHTML=`

<h2>
📌 ${escapeHTML(title)}
</h2>


<p>
${escapeHTML(description)}
</p>


<h3>
💰 Reward:
${reward.toFixed(2)}
ETB
</h3>


<button class="completeTaskBtn"
${completed?"disabled":""}
>

${
completed
?
"✅ Completed"
:
"Complete Job"
}

</button>


<p class="taskMessage">

${
completed
?
"You already completed this job."
:
""
}

</p>

`;



taskList.appendChild(card);



const button =
card.querySelector(
".completeTaskBtn"
);


const message =
card.querySelector(
".taskMessage"
);



if(completed){

continue;

}



// ==========================================
// COMPLETE BUTTON
// ==========================================


button.addEventListener(
"click",
async()=>{


button.disabled=true;


message.textContent =
"⏳ Completing job...";


try{


const result =
await completeTask({

taskId:taskId

});



if(
result.data.success
){


message.textContent =
"✅ Job completed. Reward added.";


button.textContent =
"✅ Completed";


}else{


throw new Error(
"Completion failed"
);


}



}
catch(error){


console.error(
"COMPLETE ERROR:",
error
);



message.textContent =
"❌ "+
(
error.message ||
"Job failed"
);



button.disabled=false;


}



});


}



}
catch(error){


console.error(
"TASK LOAD ERROR:",
error
);


taskList.innerHTML =
`
<p>
❌ ${error.message}
</p>
`;


}


});



// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(value){

return String(value)

.replaceAll("&","&amp;")

.replaceAll("<","&lt;")

.replaceAll(">","&gt;")

.replaceAll('"',"&quot;")

.replaceAll("'","&#039;");

}
