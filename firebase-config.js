// Firebase Configuration and Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyB7h0qsnkJ0Y3zr9n5lZx6SfLtJR7JzUEo",
    authDomain: "mychronicles-61a30.firebaseapp.com",
    projectId: "mychronicles-61a30",
    storageBucket: "mychronicles-61a30.firebasestorage.app",
    messagingSenderId: "1074348962861",
    appId: "1:1074348962861:web:901019f7b6053905ee34a4",
    measurementId: "G-4ZRS2FW5EE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
