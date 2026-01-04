import * as React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleSignOut = () => {
    logout();
  };

  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <img 
            src="/placeholder-logo.svg" 
            alt="Your Logo" 
            className="h-8" 
          />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/pricing">
            <Button variant="ghost">Pricing</Button>
          </Link>
          {isLoading ? (
            <div className="w-20 h-9 bg-muted animate-pulse rounded" />
          ) : user ? (
            <>
              <Link href="/">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link href="/ai-chat">
                <Button variant="ghost">AI Chat</Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost">Settings</Button>
              </Link>
              <Button onClick={handleSignOut} variant="outline">Sign Out</Button>
            </>
          ) : (
            <Button onClick={handleSignIn}>Sign In</Button>
          )}
        </div>
      </div>
    </nav>
  );
}
