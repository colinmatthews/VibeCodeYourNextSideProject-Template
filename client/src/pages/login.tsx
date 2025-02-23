import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { signInWithGoogle, signInWithGithub, signInWithEmail, signUpWithEmail, auth, sendPasswordResetEmail } from "@/lib/firebase";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [newUser, setNewUser] = useState<User | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

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
    console.log("[Auth] Handling email authentication");
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isSignUp) {
        console.log("[Auth] Attempting email signup");
        const userCredential = await signUpWithEmail(email, password);
        console.log("[Auth] Email signup successful", { uid: userCredential.user.uid });

        // Create Stripe customer for new user
        console.log("[Stripe] Creating customer for new user");
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
        console.log("[Stripe] Customer created successfully");

        toast({
          title: "Success",
          description: "Account created successfully"
        });
        console.log("[Auth] Redirecting to dashboard after signup");
        setLocation("/dashboard");
      } else {
        console.log("[Auth] Attempting email signin");
        const userCredential = await signInWithEmail(email, password);
        console.log("[Auth] Email signin successful", { uid: userCredential.user.uid });

        console.log("[Stripe] Ensuring customer exists for signin");
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
        console.log("[Stripe] Customer created successfully");

        toast({
          title: "Success",
          description: "Account created successfully"
        });
        console.log("[Auth] Redirecting to dashboard after signin");
        setLocation("/dashboard");
      }
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handlePasswordReset = async () => {
    try {
      if (!resetEmail) {
        toast({
          title: "Error",
          description: "Please enter your email address",
          variant: "destructive"
        });
        return;
      }
      await sendPasswordResetEmail(resetEmail);
      setShowForgotPassword(false);
      setResetEmail("");
      toast({
        title: "Success",
        description: "Password reset email sent. Please check your inbox."
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
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
            {error && <p className="text-red-500 text-xs italic mb-2">{error}</p>} {/* Added error display */}
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
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
                </Button>
                {!isSignUp && (
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm"
                    onClick={() => setShowForgotPassword(true)} // Open dialog on click
                  >
                    Forgot Password?
                  </Button>
                )}
              </div>
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

                    // Ensure user exists in database
                    await fetch('/api/users/ensure-stripe', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        firebaseId: userCredential.user.uid,
                        email: userCredential.user.email,
                        displayName: userCredential.user.displayName
                      }),
                    });

                    // Ensure Stripe customer exists
                    } catch (error: any) {
                    setError(error.message);
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
                    setError(error.message);
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

        <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForgotPassword(false)}>Cancel</Button>
              <Button onClick={handlePasswordReset}>Send Reset Link</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}