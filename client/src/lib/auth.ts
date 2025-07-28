import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  signInWithPopup, 
  GoogleAuthProvider,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from './firebase';
import { apiPost } from './queryClient';
import posthog from 'posthog-js';

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
          try {
            await apiPost('/api/login', {});
            
            // Identify user in PostHog using email as distinct ID
            if (user.email) {
              posthog.identify(user.email, {
                firebaseId: user.uid,
                email: user.email,
                displayName: user.displayName,
                emailVerified: user.emailVerified,
                photoURL: user.photoURL
              });
            }
          } catch (error) {
            console.error('Failed to sync user with backend:', error);
          }
        } catch (error) {
          console.error('Error syncing user with backend:', error);
        }
      } else {
        // Reset PostHog when user logs out
        posthog.reset();
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
      await apiPost('/api/login', {});
      
      // Identify user in PostHog using email as distinct ID
      if (user.email) {
        posthog.identify(user.email, {
          firebaseId: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          photoURL: user.photoURL
        });
      }
      
      setUser(user);
      setLoading(false);
    } catch (error) {
      // Handle Errors here.
      console.error("Error during Google Sign-in:", error);
      setLoading(false);
    }
  };

  const signOut = () => {
    posthog.reset();
    return firebaseSignOut(auth);
  };

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