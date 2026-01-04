import { Button } from "@/components/ui/button";
import type { User } from "@shared/schema";

interface NavProps {
  user: User | null;
  onLogout: () => void;
}

function Nav({ user, onLogout }: NavProps) {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <nav>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" onClick={user ? onLogout : handleLogin}>
          {user ? 'Sign out' : 'Sign in'}
        </Button>
      </div>
    </nav>
  );
}

export default Nav;
