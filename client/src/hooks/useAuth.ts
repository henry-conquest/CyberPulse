import { useQuery } from "@tanstack/react-query";

// User interface matching the user schema from shared/schema.ts
interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: string; // admin, analyst, account_manager, or user
  createdAt?: string;
  updatedAt?: string;
  tenants?: { id: number; name: string; createdAt: string; updatedAt: string }[];
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
