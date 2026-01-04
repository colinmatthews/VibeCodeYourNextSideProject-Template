import * as React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface NavLinkProps {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}

function NavLink({ href, isActive, children }: NavLinkProps) {
  return (
    <Link href={href}>
      <Button variant={isActive ? "secondary" : "ghost"}>
        {children}
      </Button>
    </Link>
  );
}

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const [location, setLocation] = useLocation();

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
          <NavLink href="/pricing" isActive={location === "/pricing"}>
            Pricing
          </NavLink>
          {isLoading ? (
            <div className="w-20 h-9 bg-muted animate-pulse rounded" />
          ) : user ? (
            <>
              <NavLink href="/" isActive={location === "/"}>
                Dashboard
              </NavLink>
              <NavLink href="/ai-chat" isActive={location === "/ai-chat"}>
                AI Chat
              </NavLink>
              <NavLink href="/settings" isActive={location === "/settings"}>
                Settings
              </NavLink>
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
