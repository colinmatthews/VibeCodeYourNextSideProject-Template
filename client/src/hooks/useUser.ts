import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { getQueryFn } from "../lib/queryClient";
import type { User } from "@shared/schema";

export function useUser() {
  const { user: authUser } = useAuth();
  
  const { data: user } = useQuery<User>({
    queryKey: [`/api/users/profile`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!authUser?.id,
  });

  return { user };
}
