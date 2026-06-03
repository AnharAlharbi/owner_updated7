import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; 

const firebaseConfig = {
  apiKey: "AIzaSyCiszOG1eVQM6n9fAu6Zb7zTwXEa-mOk_E",
  authDomain: "owner-edac5.firebaseapp.com",
  projectId: "owner-edac5",
  storageBucket: "owner-edac5.firebasestorage.app",
  messagingSenderId: "1031081768200",
  appId: "1:1031081768200:web:8654d05f8f39f1d33228bd",
  measurementId: "G-ECEC4FBLXQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); 