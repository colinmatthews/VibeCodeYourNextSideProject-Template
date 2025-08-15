
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { getQueryFn } from "../lib/queryClient";
import type { User } from "@shared/schema";

export function useUser() {
  const { user: firebaseUser } = useAuth();
  
  const { data: user } = useQuery<User>({
    queryKey: [`/api/users/profile`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!firebaseUser?.uid,
  });

  return { user };
}
