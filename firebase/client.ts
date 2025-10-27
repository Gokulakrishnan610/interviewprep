// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAHr3_b9R6Y1QOqQXmdsRPkhvM_PYSlMxw",
  authDomain: "prep-edb88.firebaseapp.com",
  projectId: "prep-edb88",
  storageBucket: "prep-edb88.firebasestorage.app",
  messagingSenderId: "583850355165",
  appId: "1:583850355165:web:f3912f232f111f7d54ae34",
  measurementId: "G-TW34N9HPPH"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
