"use client";
import { useEffect, useState } from "react";
import {
  getAdminUsers, getAdminAnalytics, grantCredits, updateFlags, adminResetPassword,
  listCoupons, generateCoupon, deactivateCoupon, reactivateCoupon,
  CouponRow,
} from "@/lib/api";
import { isLoggedIn, redirectToLogin } from "@/lib/auth";

interface UserRow {
  user_id: string;
  email: string;
  oauth_provider: string;
  created_at: string;
  interview_credits: number;
  trial_used: boolean;
  feature_flags: Record<string, unknown>;
}

interface Analytics {
  total_users: number;
  trial_users: number;
  paid_users: number;
  credits_outstanding: number;
  sessions_today: number;
  sessions_this_month: number;
}

const TABS = ["Users", "Coupons"] as const;
type Tab = typeof TABS[number];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Users");

  // ── Users tab state ───────────────────────────────────────────────────────
  const [users, setUsers] = useState<UserRow[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({});

  // ── Reset Password modal ──────────────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [resetPwd, setResetPwd]       = useState("");
  const [resetResult, setResetResult] = useState("");

  // ── Coupons tab state ─────────────────────────────────────────────────────
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [newCoupon, setNewCoupon] = useState({
    credits: 1,
    max_uses: "" as string | number,
    expires_at: "",
    note: "",
    code: "",
  });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { redirectToLogin(); return; }
    loadUsers();
    loadCoupons();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadUsers() {
    try {
      const [u, a] = await Promise.all([getAdminUsers(1, search), getAdminAnalytics()]);
      setUsers(u as UserRow[]);
      setAnalytics(a);
    } catch (e) {
      setError(String(e));
    }
  }

  async function loadCoupons() {
    try {
      setCoupons(await listCoupons(showInactive));
    } catch (e) {
      setCouponError(String(e));
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setCouponError("");
    try {
      await generateCoupon({
        credits: newCoupon.credits,
        max_uses: newCoupon.max_uses === "" ? null : Number(newCoupon.max_uses),
        expires_at: newCoupon.expires_at || null,
        note: newCoupon.note || undefined,
        code: newCoupon.code || undefined,
      });
      setNewCoupon({ credits: 1, max_uses: "", expires_at: "", note: "", code: "" });
      loadCoupons();
    } catch (e) {
      setCouponError(String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggleCoupon(coupon: CouponRow) {
    try {
      if (coupon.is_active) await deactivateCoupon(coupon.coupon_id);
      else await reactivateCoupon(coupon.coupon_id);
      loadCoupons();
    } catch (e) {
      setCouponError(String(e));
    }
  }

  async function handleGrantCredits(userId: string) {
    const val = parseInt(creditInputs[userId] || "0", 10);
    if (isNaN(val)) return;
    await grantCredits(userId, val);
    loadUsers();
  }

  async function handleToggleFlag(userId: string, flag: string, current: boolean) {
    await updateFlags(userId, { [flag]: !current });
    loadUsers();
  }

  async function handleResetPassword() {
    if (!resetTarget || !resetPwd) return;
    try {
      const result = await adminResetPassword(resetTarget.user_id, resetPwd);
      setResetResult(`Password set to: ${result.temp_password} — user will be forced to change it on next login.`);
      setResetPwd("");
    } catch (e) {
      setResetResult(String(e));
    }
  }

  if (error) return (
    <div className="max-w-4xl mx-auto p-10">
      <p className="text-red-500">{error}</p>
      <p className="text-gray-400 text-sm mt-2">
        You may not have admin access. Make sure your email is in ADMIN_EMAILS.
      </p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      {/* Analytics strip (always visible) */}
      {analytics && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
          {[
            { label: "Total Users",          value: analytics.total_users },
            { label: "Trial Users",          value: analytics.trial_users },
            { label: "Paid Users",           value: analytics.paid_users },
            { label: "Credits Outstanding",  value: analytics.credits_outstanding },
            { label: "Sessions Today",       value: analytics.sessions_today },
            { label: "Sessions This Month",  value: analytics.sessions_this_month },
          ].map((s) => (
            <div key={s.label} className="bg-white border rounded-xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-indigo-600">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition ${
              activeTab === tab
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Users tab ─────────────────────────────────────────────────────── */}
      {activeTab === "Users" && (
        <>
          <div className="flex gap-3 mb-5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadUsers()}
              placeholder="Search by email..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button onClick={loadUsers} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium">
              Search
            </button>
          </div>

          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Provider</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Credits</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Trial Used</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Test Mode</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Custom LLM</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Set Credits</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Password</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3 text-gray-400">{u.oauth_provider}</td>
                    <td className="px-4 py-3 text-center font-semibold">{u.interview_credits}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        u.trial_used ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"
                      }`}>
                        {u.trial_used ? "Yes" : "Available"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleFlag(u.user_id, "test_mode", !!(u.feature_flags?.test_mode))}
                        className={`text-xs px-3 py-1 rounded-full font-medium border transition ${
                          u.feature_flags?.test_mode
                            ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                            : "border-gray-200 text-gray-400 hover:border-indigo-300"
                        }`}
                      >
                        {u.feature_flags?.test_mode ? "Enabled" : "Enable"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleFlag(u.user_id, "can_use_custom_llm", !!(u.feature_flags?.can_use_custom_llm))}
                        className={`text-xs px-3 py-1 rounded-full font-medium border transition ${
                          u.feature_flags?.can_use_custom_llm
                            ? "bg-purple-100 border-purple-300 text-purple-700"
                            : "border-gray-200 text-gray-400 hover:border-purple-300"
                        }`}
                      >
                        {u.feature_flags?.can_use_custom_llm ? "Enabled" : "Enable"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          value={creditInputs[u.user_id] ?? ""}
                          onChange={(e) => setCreditInputs((p) => ({ ...p, [u.user_id]: e.target.value }))}
                          placeholder="0"
                          className="w-16 border border-gray-200 rounded px-2 py-1 text-sm text-center"
                        />
                        <button
                          onClick={() => handleGrantCredits(u.user_id)}
                          className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-indigo-700"
                        >
                          Set
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.oauth_provider === "local" && (
                        <button
                          onClick={() => { setResetTarget(u); setResetResult(""); setResetPwd(""); }}
                          className="text-xs px-3 py-1 rounded-full border border-orange-300 text-orange-600 hover:bg-orange-50 transition font-medium"
                        >
                          Reset
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="text-gray-400 text-center py-10">No users found.</p>
            )}
          </div>
        </>
      )}

      {/* ── Coupons tab ───────────────────────────────────────────────────── */}
      {activeTab === "Coupons" && (
        <div className="space-y-8">

          {/* Generate coupon form */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-semibold mb-4">Generate New Coupon</h2>
            {couponError && (
              <p className="text-red-500 text-sm mb-3">{couponError}</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Credits *</label>
                <input
                  type="number"
                  min={1}
                  value={newCoupon.credits}
                  onChange={(e) => setNewCoupon((p) => ({ ...p, credits: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Max Uses <span className="text-gray-300">(blank = unlimited)</span></label>
                <input
                  type="number"
                  min={1}
                  value={newCoupon.max_uses}
                  onChange={(e) => setNewCoupon((p) => ({ ...p, max_uses: e.target.value }))}
                  placeholder="Unlimited"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Expires At <span className="text-gray-300">(optional)</span></label>
                <input
                  type="datetime-local"
                  value={newCoupon.expires_at}
                  onChange={(e) => setNewCoupon((p) => ({ ...p, expires_at: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Custom Code <span className="text-gray-300">(blank = auto)</span></label>
                <input
                  type="text"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. LAUNCH50"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Internal Note <span className="text-gray-300">(optional)</span></label>
                <input
                  type="text"
                  value={newCoupon.note}
                  onChange={(e) => setNewCoupon((p) => ({ ...p, note: e.target.value }))}
                  placeholder="e.g. Beta launch giveaway"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || newCoupon.credits < 1}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {generating ? "Generating…" : "Generate Coupon"}
            </button>
          </div>

          {/* Coupon list */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Active Coupons</h2>
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => { setShowInactive(e.target.checked); loadCoupons(); }}
                  className="rounded"
                />
                Show deactivated
              </label>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Code</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Credits</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Uses</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Max Uses</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Expires</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Note</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.coupon_id} className={`border-b last:border-0 hover:bg-gray-50 ${!c.is_active ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 font-mono font-semibold tracking-wider text-gray-800">{c.code}</td>
                      <td className="px-4 py-3 text-center font-bold text-indigo-600">{c.credits}</td>
                      <td className="px-4 py-3 text-center">{c.uses}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{c.max_uses ?? "∞"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {c.expires_at
                          ? new Date(c.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : <span className="text-gray-300">Never</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{c.note || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleCoupon(c)}
                          className={`text-xs px-3 py-1 rounded-full font-medium border transition ${
                            c.is_active
                              ? "border-red-200 text-red-500 hover:bg-red-50"
                              : "border-green-200 text-green-600 hover:bg-green-50"
                          }`}
                        >
                          {c.is_active ? "Deactivate" : "Reactivate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {coupons.length === 0 && (
                <p className="text-gray-400 text-center py-10">No coupons yet. Generate one above.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password modal ───────────────────────────────────────────── */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold mb-1">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-4">
              Set a temporary password for <span className="font-semibold">{resetTarget.email}</span>.
              They will be required to change it on next login.
            </p>
            {resetResult ? (
              <>
                <div className={`text-sm rounded-lg px-4 py-3 mb-4 ${
                  resetResult.startsWith("Password set") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {resetResult}
                </div>
                <button
                  onClick={() => { setResetTarget(null); setResetResult(""); }}
                  className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-200 transition"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={resetPwd}
                  onChange={(e) => setResetPwd(e.target.value)}
                  placeholder="Temporary password (min 8 chars)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleResetPassword}
                    disabled={resetPwd.length < 8}
                    className="flex-1 bg-orange-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-orange-700 disabled:opacity-50 transition"
                  >
                    Set Password
                  </button>
                  <button
                    onClick={() => setResetTarget(null)}
                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
