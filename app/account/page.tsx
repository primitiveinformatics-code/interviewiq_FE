"use client";
import { useEffect, useState } from "react";
import { getMyAccount, getLlmSettings, saveLlmSettings, AccountInfo } from "@/lib/api";
import { isLoggedIn, redirectToLogin } from "@/lib/auth";
import { getBasePath, hardNav } from "@/lib/nav";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-center">
      <p className="text-3xl font-bold text-indigo-600">{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: "green" | "indigo" | "yellow" | "gray" | "red" }) {
  const cls: Record<string, string> = {
    green:  "bg-green-100 text-green-700",
    indigo: "bg-indigo-100 text-indigo-700",
    yellow: "bg-yellow-100 text-yellow-700",
    gray:   "bg-gray-100 text-gray-500",
    red:    "bg-red-100 text-red-600",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls[color]}`}>
      {children}
    </span>
  );
}

function sessionTypeBadge(type: string) {
  if (type === "trial")   return <Badge color="yellow">Trial</Badge>;
  if (type === "full")    return <Badge color="green">Full</Badge>;
  if (type === "testing") return <Badge color="indigo">Test</Badge>;
  return <Badge>{type}</Badge>;
}

function sessionStatusBadge(status: string) {
  if (status === "completed") return <Badge color="green">Completed</Badge>;
  if (status === "active")    return <Badge color="indigo">Active</Badge>;
  if (status === "abandoned") return <Badge color="gray">Abandoned</Badge>;
  return <Badge>{status}</Badge>;
}

export default function AccountPage() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [error, setError] = useState("");

  // LLM settings state
  const [llmKey, setLlmKey]     = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [llmMasked, setLlmMasked] = useState("");
  const [llmSaving, setLlmSaving] = useState(false);
  const [llmMsg, setLlmMsg]     = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { redirectToLogin(); return; }
    getMyAccount()
      .then((a) => {
        setAccount(a);
        if (a.feature_flags?.can_use_custom_llm) {
          getLlmSettings()
            .then((s) => { setLlmMasked(s.api_key_masked); setLlmModel(s.model); })
            .catch(() => {});
        }
      })
      .catch((e) => setError(String(e)));
  }, []);

  async function handleSaveLlm(e: React.FormEvent) {
    e.preventDefault();
    setLlmMsg("");
    setLlmSaving(true);
    try {
      await saveLlmSettings(llmKey, llmModel);
      setLlmMsg("Saved successfully.");
      setLlmKey("");
      // Refresh masked key display
      const s = await getLlmSettings();
      setLlmMasked(s.api_key_masked);
      setLlmModel(s.model);
    } catch (err: unknown) {
      setLlmMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLlmSaving(false);
    }
  }

  if (error) return (
    <div className="max-w-3xl mx-auto p-10">
      <p className="text-red-500">{error}</p>
    </div>
  );

  if (!account) return (
    <div className="max-w-3xl mx-auto p-10 text-center text-gray-400">Loading…</div>
  );

  const joined = new Date(account.joined_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
          {account.email[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{account.email}</h1>
          <p className="text-sm text-gray-400">
            Signed in via <span className="capitalize font-medium">{account.oauth_provider}</span>
            &nbsp;·&nbsp;Joined {joined}
          </p>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Interview Credits"
          value={account.interview_credits}
          sub="1 credit = 1 full interview"
        />
        <StatCard
          label="Free Trial"
          value={account.trial_used ? "Used" : "Available"}
          sub={account.trial_used ? "3-question trial complete" : "3 free questions"}
        />
        <StatCard
          label="Total Sessions"
          value={account.total_sessions}
        />
        <StatCard
          label="Sessions This Month"
          value={account.sessions_this_month}
        />
      </div>

      {/* ── Credit actions ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-10">
        <a href={getBasePath() + "/pricing"} onClick={(e) => { e.preventDefault(); hardNav("/pricing"); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
          Buy Credits
        </a>
        <a href={getBasePath() + "/pricing#coupon"} onClick={(e) => { e.preventDefault(); hardNav("/pricing#coupon"); }} className="border border-indigo-300 text-indigo-600 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition">
          Redeem Coupon
        </a>
        <a href={getBasePath() + "/dashboard"} onClick={(e) => { e.preventDefault(); hardNav("/dashboard"); }} className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
          Start Interview
        </a>
      </div>

      {/* ── Redeemed coupons ──────────────────────────────────────────────── */}
      {account.redeemed_coupons.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-10">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Redeemed Coupons</h2>
          <div className="flex flex-wrap gap-2">
            {account.redeemed_coupons.map((code) => (
              <span key={code} className="bg-white border border-gray-200 rounded-lg px-3 py-1 text-xs font-mono text-gray-600 shadow-sm">
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Custom LLM settings (admin-gated) ─────────────────────────────── */}
      {account.feature_flags?.can_use_custom_llm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-10 shadow-sm">
          <h2 className="text-base font-semibold mb-1">Custom OpenRouter Model</h2>
          <p className="text-xs text-gray-400 mb-4">
            Use your own OpenRouter API key and model for all interviews. Leave API key blank to keep existing key.
          </p>
          <form onSubmit={handleSaveLlm} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                API Key {llmMasked && <span className="text-gray-300 font-normal ml-1">Current: {llmMasked}</span>}
              </label>
              <input
                type="password"
                value={llmKey}
                onChange={(e) => setLlmKey(e.target.value)}
                placeholder="sk-or-v1-… (leave blank to keep existing)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Model</label>
              <input
                type="text"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                placeholder="e.g. openrouter/nvidia/nemotron-3-nano-30b-a3b:free"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
              />
            </div>
            {llmMsg && (
              <p className={`text-xs ${llmMsg.includes("success") || llmMsg.includes("Saved") ? "text-green-600" : "text-red-500"}`}>
                {llmMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={llmSaving || (!llmKey && !llmModel)}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {llmSaving ? "Saving…" : "Save LLM Settings"}
            </button>
          </form>
        </div>
      )}

      {/* ── Recent sessions ───────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Sessions</h2>

        {account.recent_sessions.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
            <p className="text-4xl mb-3">🎙️</p>
            <p className="font-medium">No sessions yet</p>
            <p className="text-sm mt-1">Start your first interview from the Dashboard.</p>
            <a href={getBasePath() + "/dashboard"} onClick={(e) => { e.preventDefault(); hardNav("/dashboard"); }} className="mt-4 inline-block bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
              Go to Dashboard
            </a>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100">
            {account.recent_sessions.map((s) => (
              <div key={s.session_id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize text-gray-800 truncate">
                    {s.mode} interview
                    <span className="ml-2 text-xs text-gray-400 font-normal">
                      {new Date(s.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {sessionTypeBadge(s.session_type)}
                    {sessionStatusBadge(s.status)}
                    <span className="text-xs text-gray-400">{s.questions_answered} Qs</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {s.status === "completed" ? (
                    <a href={getBasePath() + `/reports/${s.session_id}`} onClick={(e) => { e.preventDefault(); hardNav(`/reports/${s.session_id}`); }} className="text-indigo-600 hover:underline text-xs font-medium">
                      View →
                    </a>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
