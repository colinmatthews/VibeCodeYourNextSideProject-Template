
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import type { User } from "@shared/schema";

export function useUser() {
  const { user: firebaseUser } = useAuth();
  
  const { data: user } = useQuery<User>({
    queryKey: ['user', firebaseUser?.uid],
    queryFn: () => fetch(`/api/users/${firebaseUser?.uid}`).then(res => res.json()),
    enabled: !!firebaseUser?.uid,
  });

  return { user };
}
