"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isLoggedIn, getCurrentUserId } from "@/lib/auth";
import { apiFetch, startSession, getBillingStatus } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DocRow {
  doc_id: string;
  doc_type: "jd" | "resume";
  version: number;
  uploaded_at: string;
}

export default function StartInterviewPage() {
  const router = useRouter();

  const [docs, setDocs] = useState<DocRow[]>([]);
  const [billing, setBilling] = useState<{ interview_credits: number; trial_used: boolean } | null>(null);

  const [jdDocId, setJdDocId]       = useState("");
  const [resumeDocId, setResumeDocId] = useState("");
  const [jdFile, setJdFile]         = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [mode, setMode]             = useState<"practice" | "assessment">("practice");
  const [durationMins, setDurationMins] = useState<number>(0); // 0 = no limit

  const [uploading, setUploading] = useState(false);
  const [starting, setStarting]   = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    const uid = getCurrentUserId();
    Promise.all([
      apiFetch<DocRow[]>(`/documents/${uid}`).catch(() => [] as DocRow[]),
      getBillingStatus().catch(() => ({ interview_credits: 0, trial_used: false })),
    ]).then(([docList, bill]) => {
      setDocs(docList);
      setBilling(bill);
      const jd     = docList.find((d) => d.doc_type === "jd");
      const resume = docList.find((d) => d.doc_type === "resume");
      if (jd)     setJdDocId(jd.doc_id);
      if (resume) setResumeDocId(resume.doc_id);
    });
  }, [router]);

  async function uploadFile(file: File, docType: "jd" | "resume"): Promise<string> {
    const form  = new FormData();
    form.append("file", file);
    const token = localStorage.getItem("access_token");
    const res   = await fetch(`${API_URL}/documents/upload?doc_type=${docType}`, {
      method:  "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { detail?: string }).detail || "Upload failed");
    return (data as { doc_id: string }).doc_id;
  }

  async function handleStart() {
    setError("");
    setStarting(true);
    try {
      let finalJd     = jdDocId;
      let finalResume = resumeDocId;

      setUploading(true);
      if (jdFile)     finalJd     = await uploadFile(jdFile,     "jd");
      if (resumeFile) finalResume = await uploadFile(resumeFile, "resume");
      setUploading(false);

      if (!finalJd || !finalResume) {
        setError("Please provide both a job description and a resume.");
        return;
      }

      const session = await startSession(mode, finalJd, finalResume);
      // Store duration limit so interview page can read it
      if (durationMins > 0) {
        localStorage.setItem("interview_duration_minutes", String(durationMins));
      } else {
        localStorage.removeItem("interview_duration_minutes");
      }
      // Store session mode so interview page can enable practice-mode features
      localStorage.setItem("iq_session_mode", mode);
      router.push(`/interview/${session.session_id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
      setUploading(false);
    }
  }

  const jdDocs     = docs.filter((d) => d.doc_type === "jd");
  const resumeDocs = docs.filter((d) => d.doc_type === "resume");
  const canStart   = (jdDocId || jdFile) && (resumeDocId || resumeFile);
  const btnLabel   = uploading ? "Uploading…" : starting ? "Starting…" : "Start Interview";

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">
        ← Back to dashboard
      </Link>
      <h1 className="text-3xl font-bold mb-2">Start an Interview</h1>
      <p className="text-gray-500 text-sm mb-6">
        Upload your job description and resume, choose a mode, and begin.
      </p>

      {billing && !billing.trial_used && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6 text-indigo-700 text-sm font-medium">
          You have 1 free trial interview available — 3 questions, no credit needed.
        </div>
      )}
      {billing && billing.trial_used && billing.interview_credits === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-amber-700 text-sm">
          You have no credits remaining.{" "}
          <Link href="/pricing" className="font-semibold underline">Buy credits →</Link>
        </div>
      )}
      {billing && billing.interview_credits > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-green-700 text-sm font-medium">
          {billing.interview_credits} interview credit{billing.interview_credits !== 1 ? "s" : ""} available.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* ── Job Description ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold mb-3">Job Description</h2>
          {jdDocs.length > 0 && (
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-500 block mb-1">Use saved</label>
              <select
                value={jdDocId}
                onChange={(e) => { setJdDocId(e.target.value); if (e.target.value) setJdFile(null); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">— upload new instead —</option>
                {jdDocs.map((d) => (
                  <option key={d.doc_id} value={d.doc_id}>
                    JD v{d.version} · uploaded {new Date(d.uploaded_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!jdDocId && (
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Upload file <span className="text-gray-300">(.txt · .pdf · .doc · .docx)</span>
              </label>
              <input
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={(e) => setJdFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* ── Resume ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold mb-3">Resume</h2>
          {resumeDocs.length > 0 && (
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-500 block mb-1">Use saved</label>
              <select
                value={resumeDocId}
                onChange={(e) => { setResumeDocId(e.target.value); if (e.target.value) setResumeFile(null); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">— upload new instead —</option>
                {resumeDocs.map((d) => (
                  <option key={d.doc_id} value={d.doc_id}>
                    Resume v{d.version} · uploaded {new Date(d.uploaded_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!resumeDocId && (
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Upload file <span className="text-gray-300">(.txt · .pdf · .doc · .docx)</span>
              </label>
              <input
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* ── Mode ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold mb-3">Interview Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            {([
              { value: "practice",   label: "Practice",   desc: "Relaxed with hints and detailed feedback." },
              { value: "assessment", label: "Assessment", desc: "Realistic, no hints, graded scoring." },
            ] as const).map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`p-4 rounded-xl border text-left transition ${
                  mode === m.value
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500"
                    : "border-gray-200 hover:border-indigo-300"
                }`}
              >
                <p className="font-semibold text-sm">{m.label}</p>
                <p className="text-xs text-gray-500 mt-1">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Duration ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold mb-3">Session Duration <span className="text-gray-400 font-normal text-sm">(optional)</span></h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { mins: 0,  label: "No limit" },
              { mins: 15, label: "15 min" },
              { mins: 30, label: "30 min" },
              { mins: 45, label: "45 min" },
            ].map((d) => (
              <button
                key={d.mins}
                type="button"
                onClick={() => setDurationMins(d.mins)}
                className={`py-2.5 rounded-xl border text-sm font-medium transition ${
                  durationMins === d.mins
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500"
                    : "border-gray-200 text-gray-600 hover:border-indigo-300"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          {durationMins > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Interview will auto-end and generate a report after {durationMins} minutes.
            </p>
          )}
        </div>

        <button
          onClick={handleStart}
          disabled={!canStart || starting}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {btnLabel}
        </button>
      </div>
    </div>
  );
}
