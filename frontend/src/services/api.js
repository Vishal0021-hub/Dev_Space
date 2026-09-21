import axios from "axios";
import { toast } from "react-hot-toast";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 60000, // 60s timeout accommodates Render free-tier cold-start delays
});

/* ── Request interceptor: attach JWT ── */
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

/* ── Response interceptor with Render cold-start resilience ── */
let _401shown = false;

API.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;
    const status = err.response?.status;
    const message = err.response?.data?.message;

    // Auto-retry once on Render cold start (timeout or 502/503/504 gateway response)
    const isColdStartError =
      err.code === "ECONNABORTED" ||
      !err.response ||
      [502, 503, 504].includes(status);

    if (config && config.method === "get" && !config._retry && isColdStartError) {
      config._retry = true;
      toast.loading("Server waking up (cold start) — retrying…", {
        id: "cold-start-retry",
        duration: 4000,
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return API(config);
    }

    // 401: session expired
    if (status === 401) {
      if (!_401shown) {
        _401shown = true;
        toast.error("Session expired — please log in again.", {
          id: "auth-expired", duration: 4000,
        });
        setTimeout(() => { _401shown = false; }, 5000);
      }
      localStorage.removeItem("token");
      setTimeout(() => { window.location.href = "/login"; }, 1200);
      return Promise.reject(err);
    }

    // 403: permission denied
    if (status === 403) {
      toast.error(message || "You don't have permission to do that.", {
        id: "forbidden", duration: 4000,
      });
      return Promise.reject(err);
    }

    // 404: not found — components handle locally, no toast
    if (status === 404) return Promise.reject(err);

    // 429: rate limited
    if (status === 429) {
      toast.error("Too many requests — slow down a little! 🐢", {
        id: "rate-limit", duration: 5000,
      });
      return Promise.reject(err);
    }

    // 5xx: server error — show CLEAN generic message only
    if (status >= 500) {
      toast.error("Something went wrong on the server. Please try again.", {
        id: `server-${status}`, duration: 4000,
      });
      return Promise.reject(err);
    }

    // Network/timeout errors
    if (!err.response && (err.code === "ECONNABORTED" || err.message?.includes("timeout"))) {
      toast.error("Request timed out. The server took too long to respond.", {
        id: "timeout", duration: 5000,
      });
    }

    return Promise.reject(err);
  }
);

export default API;