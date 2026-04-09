// Hard navigation utility — bypasses Next.js client router.
// Needed because the Next.js router mis-handles basePath in some RSC scenarios.

const KNOWN_FIRST_SEGMENTS = new Set([
  "dashboard", "reports", "pricing", "account", "login", "interview",
  "admin", "auth", "forgot-password", "reset-password", "change-password",
]);

export function getBasePath(): string {
  if (typeof window === "undefined") return "";
  const first = window.location.pathname.split("/").filter(Boolean)[0] ?? "";
  return KNOWN_FIRST_SEGMENTS.has(first) ? "" : "/" + first;
}

export function hardNav(path: string): void {
  window.location.href = getBasePath() + path;
}
