import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined" ? window.location.origin : "http://localhost:5173",
});

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
}

export interface SessionData {
  user: AuthUser;
  session: AuthSession;
}

export const { signIn, signOut } = authClient;
