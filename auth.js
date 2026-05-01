// Authentication Logic for MyChronicles
import { auth } from "./firebase-config.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const googleProvider = new GoogleAuthProvider();

// Sign Up
export const signUp = async (email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user, error: null };
    } catch (error) {
        return { user: null, error: error.message };
    }
};

// Log In
export const logIn = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user, error: null };
    } catch (error) {
        return { user: null, error: error.message };
    }
};

// Google Log In
export const logInWithGoogle = async () => {
    try {
        const userCredential = await signInWithPopup(auth, googleProvider);
        return { user: userCredential.user, error: null };
    } catch (error) {
        return { user: null, error: error.message };
    }
};

// Log Out
export const logOut = async () => {
    try {
        await signOut(auth);
        return { error: null };
    } catch (error) {
        return { error: error.message };
    }
};

// Monitor Auth State
export const checkAuthState = (callback) => {
    onAuthStateChanged(auth, (user) => {
        callback(user);
    });
};
