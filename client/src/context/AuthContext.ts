import { createContext, useContext } from "react";
import type { SessionData } from "../lib/auth-client";

export interface AuthContextType {
  data: SessionData | null;
  isPending: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  data: null,
  isPending: true,
  error: null,
  refetch: async () => {},
});

export function useSession() {
  return useContext(AuthContext);
}
