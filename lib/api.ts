const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setToken(token: string) {
  localStorage.setItem("access_token", token);
}

export function clearToken() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_email");
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Email / password auth ─────────────────────────────────────────────────────

export async function registerWithPassword(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Registration failed");
  return data as { access_token: string; refresh_token: string };
}

export async function loginWithPassword(email: string, password: string) {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${API_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  return data as { access_token: string; refresh_token: string; must_change_password?: boolean };
}

export async function forgotPassword(email: string) {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data as { token?: string; expires_in?: number; message?: string };
}

export async function resetPassword(token: string, newPassword: string) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Reset failed");
  return data as { success: boolean };
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ success: boolean }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

// ── Billing ──────────────────────────────────────────────────────────────────

export async function getBillingStatus() {
  return apiFetch<{ interview_credits: number; trial_used: boolean }>(
    "/billing/status"
  );
}

export interface RazorpayOrder {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  credits: number;
  name: string;
  description: string;
  prefill_email: string;
}

export async function createOrder(credits: 1 | 5 | 10): Promise<RazorpayOrder> {
  return apiFetch<RazorpayOrder>("/billing/order", {
    method: "POST",
    body: JSON.stringify({ credits }),
  });
}

export async function verifyPayment(body: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  credits: number;
}) {
  return apiFetch<{ success: boolean; interview_credits: number; credits_added: number }>(
    "/billing/verify",
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function redeemCoupon(code: string) {
  return apiFetch<{ success: boolean; credits_added: number; interview_credits: number; message: string }>(
    "/billing/redeem",
    { method: "POST", body: JSON.stringify({ code }) }
  );
}

// ── Account ───────────────────────────────────────────────────────────────────

export interface SessionSummary {
  session_id: string;
  mode: string;
  session_type: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  questions_answered: number;
}

export interface AccountInfo {
  user_id: string;
  email: string;
  oauth_provider: string;
  joined_at: string;
  interview_credits: number;
  trial_used: boolean;
  redeemed_coupons: string[];
  total_sessions: number;
  sessions_this_month: number;
  recent_sessions: SessionSummary[];
  feature_flags: { can_use_custom_llm?: boolean };
}

export async function getMyAccount(): Promise<AccountInfo> {
  return apiFetch<AccountInfo>("/account/me");
}

export async function getLlmSettings() {
  return apiFetch<{ api_key_set: boolean; api_key_masked: string; model: string }>("/account/llm-settings");
}

export async function saveLlmSettings(api_key: string, model: string) {
  // Only include fields that have values — sending an empty api_key would
  // overwrite the stored key with an empty string, breaking the custom LLM flow.
  const body: Record<string, string> = {};
  if (api_key) body.api_key = api_key;
  if (model)   body.model   = model;
  return apiFetch<{ success: boolean }>("/account/llm-settings", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export async function startSession(mode: string, jd_doc_id: string, resume_doc_id: string) {
  return apiFetch<{ session_id: string; session_type: string; mode: string }>("/sessions/start", {
    method: "POST",
    body: JSON.stringify({ mode, jd_doc_id, resume_doc_id }),
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function getAdminUsers(page = 1, search = "") {
  const qs = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) qs.set("search", search);
  return apiFetch<unknown[]>(`/admin/users?${qs}`);
}

export async function getAdminAnalytics() {
  return apiFetch<{
    total_users: number;
    trial_users: number;
    paid_users: number;
    credits_outstanding: number;
    sessions_today: number;
    sessions_this_month: number;
  }>("/admin/analytics");
}

export async function grantCredits(userId: string, credits: number) {
  return apiFetch(`/admin/users/${userId}/credits`, {
    method: "PATCH",
    body: JSON.stringify({ credits }),
  });
}

export async function updateFlags(userId: string, flags: Record<string, unknown>) {
  return apiFetch(`/admin/users/${userId}/flags`, {
    method: "PATCH",
    body: JSON.stringify({ flags }),
  });
}

export async function adminResetPassword(userId: string, tempPassword: string) {
  return apiFetch<{ success: boolean; temp_password: string }>(`/admin/users/${userId}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ temp_password: tempPassword }),
  });
}

export interface CouponRow {
  coupon_id: string;
  code: string;
  credits: number;
  max_uses: number | null;
  uses: number;
  is_active: boolean;
  expires_at: string | null;
  note: string | null;
  created_at: string;
}

export async function listCoupons(includeInactive = false): Promise<CouponRow[]> {
  return apiFetch<CouponRow[]>(`/admin/coupons?include_inactive=${includeInactive}`);
}

export async function generateCoupon(body: {
  credits: number;
  max_uses?: number | null;
  expires_at?: string | null;
  note?: string;
  code?: string;
}): Promise<CouponRow> {
  return apiFetch<CouponRow>("/admin/coupons", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deactivateCoupon(couponId: string) {
  return apiFetch(`/admin/coupons/${couponId}/deactivate`, { method: "PATCH" });
}

export async function reactivateCoupon(couponId: string) {
  return apiFetch(`/admin/coupons/${couponId}/reactivate`, { method: "PATCH" });
}

// ── Reports ──────────────────────────────────────────────────────────────────

export async function getReport(sessionId: string) {
  return apiFetch<{
    session_id: string;
    aggregate_score: number;
    question_count: number;
    per_question_breakdown: unknown[];
  }>(`/reports/${sessionId}`);
}

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
