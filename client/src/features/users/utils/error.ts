import axios from "axios";

/**
 * Reusable function to extract user-friendly error messages from API or Error responses.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error || err.message || fallback;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}
