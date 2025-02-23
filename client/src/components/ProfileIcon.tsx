
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export function ProfileIcon() {
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <Link href="/profile">
      <Button variant="ghost" size="sm">
        Profile
      </Button>
    </Link>
  );
}
