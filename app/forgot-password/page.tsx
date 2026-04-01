"use client";
import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken]     = useState<string | null>(null);
  const [msg, setMsg]         = useState("");
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      if (res.token) {
        setToken(res.token);
      }
      setMsg(res.message || "Check your email for a reset link.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white p-10 rounded-2xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">Reset Password</h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          Enter your email and we&apos;ll generate a reset link.
        </p>

        {!msg ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
            <p className="text-center text-xs text-gray-400">
              <Link href="/login" className="text-indigo-500 hover:underline">Back to Sign In</Link>
            </p>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
              {msg}
            </div>

            {/* Dev mode: show token/link directly */}
            {token && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                <p className="text-xs font-semibold text-yellow-800 mb-2">Dev mode — reset link:</p>
                <a
                  href={`/reset-password?token=${token}`}
                  className="text-xs font-mono text-indigo-600 hover:underline break-all"
                >
                  /reset-password?token={token}
                </a>
              </div>
            )}

            <Link href="/login" className="inline-block text-sm text-indigo-600 hover:underline">
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
