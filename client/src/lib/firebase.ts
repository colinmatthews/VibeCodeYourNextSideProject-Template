import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  sendEmailVerification,
  updatePassword as firebaseUpdatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  User
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_PROJECT_ID + '.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_PROJECT_ID + '.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
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

export async function sendPasswordResetEmail(email: string) {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
    return true;
  } catch (error: any) {
    console.error("Password reset error:", error);
    throw error;
  }
}

export async function signUpWithEmail(email: string, password: string) {
  try {
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
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

export async function updateUserPassword(user: User, currentPassword: string, newPassword: string) {
  try {
    const credential = EmailAuthProvider.credential(
      user.email!,
      currentPassword
    );
    await reauthenticateWithCredential(user, credential);
    await firebaseUpdatePassword(user, newPassword);
    return true;
  } catch (error: any) {
    console.error("Password update error:", error);
    if (error.code === "auth/wrong-password") {
      throw new Error("Current password is incorrect");
    }
    if (error.code === "auth/weak-password") {
      throw new Error("New password should be at least 6 characters long");
    }
    throw new Error(error.message);
  }
}