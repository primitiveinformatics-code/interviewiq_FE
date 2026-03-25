"use client";
import { useState } from "react";
import { redirectToOAuth } from "@/lib/auth";
import { registerWithPassword, loginWithPassword, setToken } from "@/lib/api";
import { useRouter } from "next/navigation";

type Mode = "social" | "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("social");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "register" && password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const data =
        mode === "register"
          ? await registerWithPassword(email, password)
          : await loginWithPassword(email, password);

      setToken(data.access_token);
      localStorage.setItem("user_email", email);
      if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
      if (data.must_change_password) {
        router.push("/change-password");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-white p-10 rounded-2xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">Sign in to InterviewIQ</h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          Your first interview is free — no credit card needed.
        </p>

        {/* ── Tab switcher ── */}
        <div className="flex rounded-lg border border-gray-200 mb-6 overflow-hidden text-sm font-medium">
          {(["social", "login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 py-2 transition ${
                mode === m
                  ? "bg-indigo-600 text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {m === "social" ? "Social" : m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* ── Social OAuth ── */}
        {mode === "social" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => redirectToOAuth("google")}
              className="flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-3 hover:bg-gray-50 transition font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34 33.3 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l6-6C34.5 6.5 29.6 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c10.6 0 19.5-7.7 19.5-19.5 0-1.3-.1-2.7-.5-4z" />
              </svg>
              Continue with Google
            </button>
            <button
              onClick={() => redirectToOAuth("github")}
              className="flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-3 hover:bg-gray-50 transition font-medium"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.4-4.04-1.4-.54-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.48 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02 0 2.04.13 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.83.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>
          </div>
        )}

        {/* ── Email / password ── */}
        {(mode === "login" || mode === "register") && (
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="••••••••"
              />
            </div>

            {mode === "register" && (
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
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50 transition mt-1"
            >
              {loading
                ? "Please wait…"
                : mode === "register"
                ? "Create Account"
                : "Sign In"}
            </button>

            <p className="text-center text-xs text-gray-400 mt-1">
              {mode === "login" ? (
                <>No account?{" "}
                  <button type="button" onClick={() => setMode("register")} className="text-indigo-600 hover:underline">Register</button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button type="button" onClick={() => setMode("login")} className="text-indigo-600 hover:underline">Sign In</button>
                </>
              )}
            </p>
            {mode === "login" && (
              <p className="text-center text-xs text-gray-400">
                <a href="/forgot-password" className="text-indigo-500 hover:underline">Forgot password?</a>
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
