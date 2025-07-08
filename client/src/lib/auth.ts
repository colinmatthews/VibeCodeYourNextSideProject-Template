import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  signInWithPopup, 
  GoogleAuthProvider,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {}
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Get the ID token to send to backend
          const idToken = await user.getIdToken();
          
          // Login to backend to ensure user exists in database
          const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
          });

          if (!response.ok) {
            console.error('Failed to sync user with backend');
          }
        } catch (error) {
          console.error('Error syncing user with backend:', error);
        }
      }
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const user = result.user;
      
      // Get the ID token to send to backend
      const idToken = await user.getIdToken();
      
      // Login to backend to ensure user exists in database
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create/verify user');
      }
      
      setUser(user);
      setLoading(false);
    } catch (error) {
      // Handle Errors here.
      console.error("Error during Google Sign-in:", error);
      setLoading(false);
    }
  };

  const signOut = () => firebaseSignOut(auth);

  return React.createElement(AuthContext.Provider, {
    value: {
      user,
      loading,
      signInWithGoogle,
      signOut
    },
    children
  });
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { auth };