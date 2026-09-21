/**
 * Centralized Authentication & LocalStorage Helpers
 * Safely parses JSON to prevent unhandled syntax errors when storage is corrupted or undefined.
 */

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw || raw === "undefined" || raw === "null") return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error("[auth] Failed to parse stored user:", err);
    return {};
  }
};

export const getStoredUserId = () => {
  const user = getStoredUser();
  return user?._id || null;
};

export const getStoredToken = () => {
  try {
    return localStorage.getItem("token") || null;
  } catch {
    return null;
  }
};

export const setStoredAuth = (token, user) => {
  try {
    if (token) localStorage.setItem("token", token);
    if (user)  localStorage.setItem("user", JSON.stringify(user));
  } catch (err) {
    console.error("[auth] Failed to save auth state:", err);
  }
};

export const clearStoredAuth = () => {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("devspace_last_workspace");
  } catch (err) {
    console.error("[auth] Failed to clear auth state:", err);
  }
};
