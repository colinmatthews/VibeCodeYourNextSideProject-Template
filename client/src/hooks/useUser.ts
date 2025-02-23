
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

export function useUser() {
  const { user: firebaseUser } = useAuth();
  
  const { data: user } = useQuery({
    queryKey: [`/api/users/${firebaseUser?.uid}`],
    enabled: !!firebaseUser,
  });

  return { user };
}
