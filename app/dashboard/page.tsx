"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getBasePath, hardNav } from "@/lib/nav";
import { isLoggedIn, getCurrentUserId, getUserEmail, redirectToLogin } from "@/lib/auth";

interface SessionRow {
  session_id: string;
  mode: string;
  session_type: string;
  status: string;
  started_at: string;
  ended_at: string | null;
}

interface Billing {
  interview_credits: number;
  trial_used: boolean;
}

function getDisplayName(email: string | null): string {
  if (!email) return "there";
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function StatCard({ label, value, sub, color = "indigo" }: {
  label: string; value: string | number; sub?: string;
  color?: "indigo" | "green" | "amber" | "gray";
}) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    green:  "bg-green-50  text-green-700  border-green-100",
    amber:  "bg-amber-50  text-amber-700  border-amber-100",
    gray:   "bg-gray-50   text-gray-700   border-gray-200",
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-0.5">{label}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { redirectToLogin(); return; }
    setEmail(getUserEmail());
    const uid = getCurrentUserId();
    Promise.all([
      apiFetch<SessionRow[]>(`/reports/history/${uid}`).catch(() => []),
      apiFetch<Billing>("/billing/status").catch(() => ({ interview_credits: 0, trial_used: false })),
    ]).then(([s, b]) => {
      setSessions(s as SessionRow[]);
      setBilling(b as Billing);
    });
  }, []);

  const credits   = billing?.interview_credits ?? null;
  const canStart  = billing !== null && (!billing.trial_used || billing.interview_credits > 0);
  const startHref = canStart ? "/dashboard/start" : "/pricing";

  // Derived analytics
  const completed = sessions.filter((s) => s.status === "completed").length;
  const total     = sessions.length;
  const fullSessions = sessions.filter((s) => s.session_type === "full" && s.status === "completed").length;
  const modes     = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.mode] = (acc[s.mode] || 0) + 1; return acc;
  }, {});
  const topMode   = Object.entries(modes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <p className="text-sm text-gray-400 mb-0.5">Welcome back,</p>
          <h1 className="text-3xl font-bold">{getDisplayName(email)}</h1>
          {email && <p className="text-sm text-gray-400 mt-0.5">{email}</p>}
        </div>
        <div className="flex gap-3 items-center">
          {credits !== null && (
            <span className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium text-sm border border-indigo-100">
              {credits} credit{credits !== 1 ? "s" : ""} remaining
            </span>
          )}
          <a href={getBasePath() + "/pricing"} onClick={(e) => { e.preventDefault(); hardNav("/pricing"); }} className="border border-indigo-200 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition">
            Buy Credits
          </a>
        </div>
      </div>

      {/* ── Start Interview CTA ── */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div>
          <h2 className="text-white font-bold text-lg">
            {canStart ? "Ready for your next interview?" : "No credits remaining"}
          </h2>
          <p className="text-indigo-100 text-sm mt-1">
            {billing === null
              ? "Loading…"
              : !billing.trial_used
              ? "You have 1 free trial interview available — 3 questions, no credit needed."
              : billing.interview_credits > 0
              ? `${billing.interview_credits} credit${billing.interview_credits !== 1 ? "s" : ""} available. Each credit = one full interview.`
              : "Purchase credits to continue practising."}
          </p>
        </div>
        <a
          href={getBasePath() + startHref}
          onClick={(e) => { e.preventDefault(); hardNav(startHref); }}
          className="w-full sm:w-auto bg-white text-indigo-600 font-semibold px-6 py-3 rounded-xl hover:bg-indigo-50 transition text-sm text-center"
        >
          {canStart ? "Start Interview →" : "Buy Credits →"}
        </a>
      </div>

      {/* ── Analytics ── */}
      <h2 className="text-lg font-semibold mb-4">Your Performance</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Sessions"        value={total}         color="indigo" />
        <StatCard label="Completed"             value={completed}     color="green"  sub={total ? `${Math.round((completed / total) * 100)}% completion` : undefined} />
        <StatCard label="Full Interviews"       value={fullSessions}  color="amber"  sub="credits used" />
        <StatCard label="Favourite Mode"        value={topMode ? topMode.charAt(0).toUpperCase() + topMode.slice(1) : "—"} color="gray" />
      </div>

      {/* ── Session History (collapsible, collapsed by default) ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <button
          onClick={() => setHistoryOpen((o) => !o)}
          className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold text-gray-700">Session History</span>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{sessions.length}</span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${historyOpen ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {historyOpen && (
          <div className="border-t border-gray-100">
            {sessions.length === 0 ? (
              <div className="text-gray-400 text-center py-10 text-sm">
                No interviews yet. Hit <strong>Start Interview</strong> above to begin.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {sessions.map((s) => (
                  <div key={s.session_id} className="px-5 py-3.5 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-sm capitalize">{s.mode} interview</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(s.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {" · "}
                        <span className={s.session_type === "trial" ? "text-amber-500" : "text-green-600"}>
                          {s.session_type}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        s.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {s.status}
                      </span>
                      {s.status === "completed" && (
                        <a href={getBasePath() + `/reports/${s.session_id}`} onClick={(e) => { e.preventDefault(); hardNav(`/reports/${s.session_id}`); }} className="text-indigo-600 text-xs font-medium hover:underline">
                          Report →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
