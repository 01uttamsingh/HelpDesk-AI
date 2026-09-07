import { useState, useCallback, useEffect, type ReactNode } from "react";
import { authClient, type SessionData } from "../lib/auth-client";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SessionData | null>(null);
  const [isPending, setIsPending] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await authClient.getSession();
      if (res && res.data) {
        setData(res.data as unknown as SessionData);
      } else {
        setData(null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setIsPending(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    authClient
      .getSession()
      .then((res) => {
        if (!ignore) {
          if (res && res.data) {
            setData(res.data as unknown as SessionData);
          } else {
            setData(null);
          }
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setData(null);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsPending(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        data,
        isPending,
        error,
        refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
