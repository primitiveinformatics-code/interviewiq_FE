"use client";
import { useState } from "react";
import { changePassword } from "@/lib/api";
import { isLoggedIn, redirectToLogin } from "@/lib/auth";
import { hardNav } from "@/lib/nav";

export default function ChangePasswordPage() {

  const [current, setCurrent]   = useState("");
  const [newPwd, setNewPwd]     = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);

  if (!isLoggedIn()) {
    redirectToLogin();
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPwd !== confirm) { setError("New passwords do not match"); return; }
    if (newPwd.length < 8)  { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await changePassword(current, newPwd);
      setSuccess(true);
      setTimeout(() => hardNav("/dashboard"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white p-10 rounded-2xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">Change Password</h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          Your account requires a new password before continuing.
        </p>

        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 text-center">
            Password changed successfully! Redirecting…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50 transition mt-1"
            >
              {loading ? "Saving…" : "Change Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
