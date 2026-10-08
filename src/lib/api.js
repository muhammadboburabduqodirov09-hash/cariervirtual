export const API_URL = (import.meta.env.VITE_API_URL || "https://cariervirtual.onrender.com").replace(/\/+$/, "");

const SESSION_TOKEN_KEY = "mvk-tab-session-token";

export function apiUrl(path) {
  return `${API_URL}/${String(path).replace(/^\/+/, "")}`;
}

export function tabSessionHeaders() {
  const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  return token ? { "X-MVK-Session": token } : {};
}

export function saveTabSession(token) {
  if (typeof token === "string" && token) sessionStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearTabSession() {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
}
