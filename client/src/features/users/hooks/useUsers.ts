import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useMemo } from "react";
import { usersApi } from "../api/users.api";
import type { UserItem } from "../types";

export function useUsers() {
  const query = useQuery<UserItem[], Error>({
    queryKey: ["users"],
    queryFn: () => usersApi.getUsers(),
  });

  const errorMessage = useMemo(() => {
    if (!query.error) return null;
    if (axios.isAxiosError(query.error)) {
      if (query.error.response?.status === 401) {
        return "You must be signed in to view users.";
      }
      if (query.error.response?.status === 403) {
        return "Access denied. Admin privileges are required.";
      }
      return (
        query.error.response?.data?.error ||
        query.error.message ||
        "Failed to load users"
      );
    }
    return query.error.message || "Failed to load users";
  }, [query.error]);

  return {
    ...query,
    users: query.data ?? [],
    errorMessage,
  };
}
