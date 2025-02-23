
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export function ProfileIcon() {
  const { user } = useAuth();
  
  if (!user) return null;

  const initials = user.displayName 
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email?.[0].toUpperCase() || 'U';

  return (
    <Link href="/profile">
      <Avatar className="cursor-pointer">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
    </Link>
  );
}
