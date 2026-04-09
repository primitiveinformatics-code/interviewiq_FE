"use client";
import { use, useEffect, useState } from "react";
import { getReport } from "@/lib/api";
import { getBasePath, hardNav } from "@/lib/nav";
import { isLoggedIn, redirectToLogin } from "@/lib/auth";

interface QABreakdown {
  question: string;
  answer: string;
  topic: string;
  scores: {
    overall_weighted?: number;
    technical_accuracy?: number;
    depth?: number;
    problem_solving?: number;
    feedback?: string;
    [key: string]: number | string | undefined;
  };
}

interface Report {
  session_id: string;
  aggregate_score: number;
  question_count: number;
  per_question_breakdown: QABreakdown[];
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color =
    pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="font-bold text-gray-800">{Math.round(pct)}<span className="text-gray-400">/100</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PerformanceBadge({ score }: { score: number }) {
  if (score >= 85) return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">Excellent</span>;
  if (score >= 70) return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold">Good</span>;
  if (score >= 50) return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-semibold">Average</span>;
  return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">Needs Work</span>;
}

function QuestionCard({ qa, index }: { qa: QABreakdown; index: number }) {
  const [open, setOpen] = useState(false);
  const overall = qa.scores.overall_weighted ?? 0;
  const scoreColor =
    overall >= 75 ? "text-green-600" : overall >= 50 ? "text-amber-500" : "text-red-500";
  const scoreBg =
    overall >= 75 ? "bg-green-50 border-green-100" : overall >= 50 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100";

  const dimensionScores = [
    { label: "Technical Accuracy", key: "technical_accuracy" },
    { label: "Depth",              key: "depth" },
    { label: "Problem Solving",    key: "problem_solving" },
  ].filter((d) => d.key in qa.scores && typeof qa.scores[d.key] === "number");

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-5 py-4 hover:bg-gray-50 transition"
      >
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
                {qa.topic || "General"}
              </span>
              <span className="text-xs text-gray-400">Q{index + 1}</span>
            </div>
            <p className="font-medium text-sm text-gray-900 truncate">{qa.question}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className={`border rounded-lg px-3 py-1.5 text-center ${scoreBg}`}>
              <p className={`text-lg font-bold leading-none ${scoreColor}`}>{Math.round(overall)}</p>
              <p className="text-xs text-gray-400 mt-0.5">/ 100</p>
            </div>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Candidate's answer */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Your Answer</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 italic">
              "{qa.answer || "No answer provided"}"
            </p>
          </div>

          {/* Score bars */}
          {dimensionScores.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scores</p>
              {dimensionScores.map((d) => (
                <ScoreBar key={d.key} label={d.label} value={qa.scores[d.key] as number} />
              ))}
            </div>
          )}

          {/* Feedback */}
          {qa.scores.feedback && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Feedback</p>
              <p className="text-sm text-indigo-900">{qa.scores.feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: sid } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { redirectToLogin(); return; }
    getReport(sid)
      .then(setReport)
      .catch((e) => setError(e.message));
  }, [sid]);

  if (error) return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <a href={getBasePath() + "/reports"} onClick={(e) => { e.preventDefault(); hardNav("/reports"); }} className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">← All Reports</a>
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">{error}</div>
    </div>
  );
  if (!report) return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-gray-400 text-sm">Loading report…</div>
  );

  // Compute overall score from per-question breakdown (always consistent with what's shown)
  const computedOverall = report.per_question_breakdown.length
    ? Math.round(
        report.per_question_breakdown
          .map((qa) => qa.scores.overall_weighted ?? 0)
          .reduce((a, b) => a + b, 0) / report.per_question_breakdown.length
      )
    : report.aggregate_score;

  const agg = computedOverall;
  const aiHolistic = report.aggregate_score;
  const showHolistic = Math.abs(aiHolistic - computedOverall) > 5;
  const scoreColor =
    agg >= 75 ? "text-green-600" : agg >= 50 ? "text-amber-500" : "text-red-500";

  // Aggregate dimension averages across all questions
  const dims = ["technical_accuracy", "depth", "problem_solving"] as const;
  const dimLabels: Record<string, string> = {
    technical_accuracy: "Technical Accuracy",
    depth:              "Depth",
    problem_solving:    "Problem Solving",
  };
  const dimAverages = dims
    .map((key) => {
      const vals = report.per_question_breakdown
        .map((qa) => qa.scores[key])
        .filter((v): v is number => typeof v === "number");
      return vals.length
        ? { key, avg: vals.reduce((a, b) => a + b, 0) / vals.length }
        : null;
    })
    .filter(Boolean) as { key: string; avg: number }[];

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <a href={getBasePath() + "/reports"} onClick={(e) => { e.preventDefault(); hardNav("/reports"); }} className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">
        ← All Reports
      </a>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Interview Report</h1>
          <p className="text-gray-400 text-sm font-mono">
            {sid.slice(0, 8)}…
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 text-center shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Overall Score</p>
          <p className={`text-5xl font-black ${scoreColor}`}>
            {agg}
          </p>
          <p className="text-xs text-gray-400 mb-2">out of 100</p>
          <PerformanceBadge score={agg} />
          {showHolistic && (
            <p className="text-xs text-gray-400 mt-2">AI holistic rating: {aiHolistic}</p>
          )}
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className="flex gap-3 mb-8">
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/reports/${sid}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PDF
        </a>
        <a
          href={getBasePath() + "/dashboard/start"}
          onClick={(e) => { e.preventDefault(); hardNav("/dashboard/start"); }}
          className="flex items-center gap-2 border border-indigo-200 text-indigo-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-50 transition"
        >
          Try Again →
        </a>
      </div>

      {/* ── Dimension averages ── */}
      {dimAverages.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Performance Breakdown</h2>
          <div className="space-y-4">
            {dimAverages.map(({ key, avg }) => (
              <ScoreBar key={key} label={dimLabels[key] ?? key} value={avg} />
            ))}
          </div>
        </div>
      )}

      {/* ── Scoring methodology ── */}
      <details className="bg-gray-50 border border-gray-200 rounded-xl mb-6 group">
        <summary className="px-5 py-3 cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2 list-none select-none">
          <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How is this score calculated?
          <svg className="w-3.5 h-3.5 ml-auto text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-5 pb-4 text-sm text-gray-600 space-y-3 border-t border-gray-200 pt-4">
          <p>Each answer is evaluated on <strong>3 dimensions</strong> (scored 0–100):</p>
          <ul className="space-y-1.5 pl-2">
            <li><span className="font-semibold text-gray-800">Technical Accuracy</span> — correctness and precision of your answer</li>
            <li><span className="font-semibold text-gray-800">Depth</span> — how thoroughly you explored the topic</li>
            <li><span className="font-semibold text-gray-800">Problem Solving</span> — your approach, structure, and reasoning</li>
          </ul>
          <p>The <strong>per-question score</strong> is a weighted average of these three dimensions.</p>
          <p>Your <strong>overall score</strong> is the average of all per-question scores.</p>
          <div className="flex gap-4 pt-1 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> ≥ 75 — Good</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> 50–74 — Average</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> &lt; 50 — Needs Work</span>
          </div>
        </div>
      </details>

      {/* ── Per-question breakdown ── */}
      <h2 className="font-semibold text-gray-800 mb-3">
        Question Breakdown
        <span className="ml-2 text-gray-400 font-normal text-sm">({report.question_count} questions)</span>
      </h2>
      <div className="space-y-3">
        {report.per_question_breakdown.map((qa, i) => (
          <QuestionCard key={i} qa={qa} index={i} />
        ))}
      </div>
    </div>
  );
}
