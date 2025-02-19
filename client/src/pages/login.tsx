
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { signInWithGoogle, auth } from "@/lib/firebase";
import { FcGoogle } from "react-icons/fc";
import Navbar from "@/components/Navbar";

export default function Login() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setLocation("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-primary/10 to-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => signInWithGoogle()}
              className="w-full flex items-center justify-center gap-2"
            >
              <FcGoogle className="w-5 h-5" />
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
