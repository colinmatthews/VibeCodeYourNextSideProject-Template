import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { signInWithGoogle, signInWithGithub, signInWithEmail, signUpWithEmail, auth } from "@/lib/firebase";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [newUser, setNewUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && !showProfileForm) {
        setLocation("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [setLocation, showProfileForm]);

  const handlePostSignup = (user: User) => {
    setNewUser(user);
    setShowProfileForm(true);
  };

  if (showProfileForm && newUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-primary/10 to-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <UserProfileForm onComplete={() => setLocation("/dashboard")} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        try {
          const userCredential = await signInWithEmail(email, password);
          // Ensure Stripe customer exists
          await fetch('/api/users/ensure-stripe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              firebaseId: userCredential.user.uid,
              email: userCredential.user.email,
            }),
          });
        } catch (error: any) {
          if (error.code === "auth/user-not-found") {
            toast({
              title: "Account not found",
              description: "Would you like to create an account?",
            });
            setLocation("/signup");
            return;
          }
          throw error;
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-primary/10 to-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailAuth} className="space-y-4 mb-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" className="w-full">
                {isSignUp ? "Sign Up" : "Sign In"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
              </Button>
            </form>
            <div className="space-y-2">
              <Button
                onClick={async () => {
                  try {
                    console.log("[Auth] Starting Google sign-in flow");
                    const userCredential = await signInWithGoogle();
                    console.log("[Auth] Google sign-in successful", { 
                      uid: userCredential.user.uid,
                      email: userCredential.user.email 
                    });
                    
                    // Ensure Stripe customer exists
                    console.log("[Stripe] Ensuring customer exists");
                    await fetch('/api/users/ensure-stripe', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        firebaseId: userCredential.user.uid,
                        email: userCredential.user.email,
                      }),
                    });
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message,
                      variant: "destructive"
                    });
                  }
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                <FcGoogle className="w-5 h-5" />
                Sign in with Google
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await signInWithGithub();
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message,
                      variant: "destructive"
                    });
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#24292e] hover:bg-[#1b1f23]"
              >
                <FaGithub className="w-5 h-5" />
                Sign in with GitHub
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}