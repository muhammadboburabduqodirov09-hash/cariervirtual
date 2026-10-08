export const API_URL = (import.meta.env.VITE_API_URL || "https://cariervirtual.onrender.com").replace(/\/+$/, "");

export function apiUrl(path) {
  return `${API_URL}/${String(path).replace(/^\/+/, "")}`;
}
