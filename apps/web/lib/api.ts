import axios from "axios";

// Always use same-origin /api proxy so auth cookies persist reliably.
// Next.js rewrites /api/* to the backend configured in next.config.js.
const baseURL = "";

export const api = axios.create({
  baseURL,
  withCredentials: true
});
