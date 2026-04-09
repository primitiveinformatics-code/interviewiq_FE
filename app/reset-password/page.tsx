"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/api";
import { getBasePath, hardNav } from "@/lib/nav";

function ResetPasswordForm() {
  const searchParams  = useSearchParams();
  const token         = searchParams.get("token") || "";

  const [newPwd, setNewPwd]       = useState("");
  const [confirm, setConfirm]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  useEffect(() => {
    if (!token) setError("No reset token found. Please request a new reset link.");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPwd !== confirm) { setError("Passwords do not match"); return; }
    if (newPwd.length < 8)  { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await resetPassword(token, newPwd);
      setSuccess(true);
      setTimeout(() => hardNav("/login"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white p-10 rounded-2xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">Set New Password</h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          Choose a new password for your account.
        </p>

        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 text-center">
            Password updated! Redirecting to sign in…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
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
              disabled={loading || !token}
              className="bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {loading ? "Saving…" : "Set New Password"}
            </button>
            <p className="text-center text-xs text-gray-400">
              <a href={getBasePath() + "/login"} onClick={(e) => { e.preventDefault(); hardNav("/login"); }} className="text-indigo-500 hover:underline">Back to Sign In</a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
