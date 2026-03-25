"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { isLoggedIn, getCurrentUserId } from "@/lib/auth";

interface SessionRow {
  session_id: string;
  mode: string;
  session_type: string;
  status: string;
  started_at: string;
  ended_at: string | null;
}

function ModeIcon({ mode }: { mode: string }) {
  if (mode === "assessment") {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

export default function ReportsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "completed" | "in_progress">("all");

  useEffect(() => {
    if (!isLoggedIn()) { window.location.href = "/login"; return; }
    const uid = getCurrentUserId();
    apiFetch<SessionRow[]>(`/reports/history/${uid}`)
      .then((s) => setSessions(s as SessionRow[]))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = sessions.filter((s) => {
    if (filter === "completed")   return s.status === "completed";
    if (filter === "in_progress") return s.status !== "completed";
    return true;
  });

  const completed   = sessions.filter((s) => s.status === "completed").length;
  const inProgress  = sessions.length - completed;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* ── Header ── */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Reports</h1>
          <p className="text-gray-400 text-sm">All your interview sessions and performance reports.</p>
        </div>
        <a
          href="/dashboard/start"
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
        >
          + New Interview
        </a>
      </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Sessions</p>
        </div>
        <div className="bg-white border border-green-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{completed}</p>
          <p className="text-xs text-gray-500 mt-0.5">Completed</p>
        </div>
        <div className="bg-white border border-amber-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{inProgress}</p>
          <p className="text-xs text-gray-500 mt-0.5">In Progress</p>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-2 mb-4">
        {(["all", "completed", "in_progress"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
            }`}
          >
            {f === "all" ? "All" : f === "completed" ? "Completed" : "In Progress"}
          </button>
        ))}
      </div>

      {/* ── Session list ── */}
      {loading ? (
        <div className="text-gray-400 text-sm py-16 text-center">Loading sessions…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
          <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400 text-sm">
            {sessions.length === 0
              ? "No interviews yet."
              : "No sessions match this filter."}
          </p>
          {sessions.length === 0 && (
            <a href="/dashboard/start" className="inline-block mt-3 text-indigo-600 text-sm font-medium hover:underline">
              Start your first interview →
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const date = new Date(s.started_at);
            const dateStr = date.toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric",
            });
            const timeStr = date.toLocaleTimeString("en-IN", {
              hour: "2-digit", minute: "2-digit",
            });
            const isCompleted = s.status === "completed";
            return (
              <div
                key={s.session_id}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-indigo-200 hover:shadow-sm transition group"
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                    <ModeIcon mode={s.mode} />
                  </div>
                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-sm capitalize text-gray-900">
                        {s.mode} Interview
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.session_type === "trial"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {s.session_type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {dateStr} · {timeStr}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    isCompleted
                      ? "bg-green-50 text-green-700 border border-green-100"
                      : "bg-yellow-50 text-yellow-700 border border-yellow-100"
                  }`}>
                    {isCompleted ? "Completed" : "In progress"}
                  </span>
                  {isCompleted ? (
                    <a
                      href={`/reports/${s.session_id}`}
                      className="text-indigo-600 text-sm font-semibold hover:underline group-hover:text-indigo-700"
                    >
                      View Report →
                    </a>
                  ) : (
                    <a
                      href={`/interview/${s.session_id}`}
                      className="text-amber-600 text-sm font-semibold hover:underline"
                    >
                      Resume →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
