import axios from "axios";

/**
 * Shared Axios client instance for Helpdesk REST API calls.
 * Configured with credentials enabled to include Better Auth session cookies.
 */
export const api = axios.create({
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
