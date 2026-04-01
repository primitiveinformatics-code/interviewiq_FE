import { setToken, clearToken } from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function redirectToLogin() {
  if (typeof window !== "undefined") window.location.href = BASE + "/login";
}

export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("access_token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

export function getUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("user_email");
}

export function isLoggedIn(): boolean {
  return !!getCurrentUserId();
}

export function logout() {
  clearToken();
  redirectToLogin();
}

/** Called after Keycloak OAuth callback — exchanges email for JWT */
export async function loginWithCallback(email: string, provider: string, rememberMe = false) {
  const params = new URLSearchParams({ email, oauth_provider: provider, remember_me: String(rememberMe) });
  const res = await fetch(`${API_URL}/auth/callback?${params}`, { method: "POST" });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();
  setToken(data.access_token);
  localStorage.setItem("user_email", email);
  return data;
}

/** Redirect to Keycloak OAuth for the given provider */
export function redirectToOAuth(provider: "google" | "github" | "linkedin") {
  window.location.href = `${API_URL}/auth/login/${provider}`;
}
