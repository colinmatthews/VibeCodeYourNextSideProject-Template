
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
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-primary/10 to-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button
                onClick={() => signInWithGoogle()}
                className="w-full flex items-center justify-center gap-2"
              >
                <FcGoogle className="w-5 h-5" />
                Sign in with Google
              </Button>
              <Button
                onClick={() => signInWithFacebook()}
                className="w-full flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#1865D1]"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Sign in with Facebook
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
