
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

const githubProvider = new GithubAuthProvider();

export async function signInWithGoogle() {
  try {
    console.log('signInWithGoogle');
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Google sign in successful in firebase", result)
    return result;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}

export function signInWithGithub() {
  return signInWithPopup(auth, githubProvider);
}

export async function signUpWithEmail(email: string, password: string) {
  try {
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await userCredential.user.sendEmailVerification();
    return userCredential;
  } catch (error: any) {
    if (error.code === "auth/email-already-in-use") {
      throw new Error("Email already in use. Please sign in instead.");
    }
    if (error.code === "auth/invalid-email") {
      throw new Error("Please enter a valid email address.");
    }
    if (error.code === "auth/weak-password") {
      throw new Error("Password should be at least 6 characters long.");
    }
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      throw new Error("No account found with this email.");
    }
    if (error.code === "auth/wrong-password") {
      throw new Error("Invalid password.");
    }
    throw new Error(error.message);
  }
}
