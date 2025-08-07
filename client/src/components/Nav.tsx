import { Button } from "@/components/ui/button";
import { User } from "firebase/auth";

interface NavProps {
  user: User | null;
  signOut: () => void;
  signIn: () => void;
}

function Nav({ user, signOut, signIn }: NavProps) {
  return (
    <nav>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" onClick={user ? signOut : signIn}>
          {user ? 'Sign out' : 'Sign in'}
        </Button>
      </div>
    </nav>
  );
}

export default Nav;