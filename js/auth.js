import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


export function checkUser(callback) {
  
  onAuthStateChanged(auth, (user) => {
    
    if (user) {
      
      callback(user);
      
    } else {
      
      window.location.href = "login.html";
      
    }
    
  });
  
}