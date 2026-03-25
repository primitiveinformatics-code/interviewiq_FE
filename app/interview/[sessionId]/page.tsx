"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  role: "interviewer" | "candidate" | "system" | "hint";
  content: string;
  topic?: string;
}

function fmt(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function InterviewPage({ params }: { params: { sessionId: string } }) {
  const sid = params.sessionId;
  const MSG_KEY = `iq_msgs_${sid}`;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [phase, setPhase]       = useState<"connecting" | "active" | "ending" | "trial_limit" | "complete">("connecting");
  const [connError, setConnError] = useState<string | null>(null);

  // Practice mode
  const [isPractice,  setIsPractice]  = useState(false);
  const [hintLoading, setHintLoading] = useState(false);

  // Timer
  const [elapsed,   setElapsed]   = useState(0);
  const [limitSecs, setLimitSecs] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Report progress bar
  const [reportProgress, setReportProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio
  const [audioMode,    setAudioMode]    = useState(true);
  const [isRecording,  setIsRecording]  = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking,     setSpeaking]     = useState(false);

  const wsRef            = useRef<WebSocket | null>(null);
  const bottomRef        = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const currentAudioRef  = useRef<HTMLAudioElement | null>(null);
  const isRecordingRef   = useRef(false);
  const audioModeRef     = useRef(true);
  const phaseRef         = useRef<string>("connecting");

  // Keep refs in sync
  useEffect(() => { audioModeRef.current = audioMode; }, [audioMode]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  // ── Persist messages to localStorage ──────────────────────────────────────────
  function persistMessages(msgs: Message[]) {
    try {
      localStorage.setItem(MSG_KEY, JSON.stringify(msgs));
    } catch { /* storage full — ignore */ }
  }

  function addMessage(msg: Message) {
    setMessages((prev) => {
      const next = [...prev, msg];
      persistMessages(next);
      return next;
    });
  }

  // ── TTS ───────────────────────────────────────────────────────────────────────
  const speakText = useCallback(async (text: string) => {
    try {
      setSpeaking(true);
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        URL.revokeObjectURL(currentAudioRef.current.src);
        currentAudioRef.current = null;
      }
      const res = await fetch(`${API_URL}/audio/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { setSpeaking(false); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); setSpeaking(false); };
      audio.onerror = () => setSpeaking(false);
      audio.play();
    } catch { setSpeaking(false); }
  }, [token]);

  // ── STT ───────────────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          const res = await fetch(`${API_URL}/audio/stt`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.text) setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
          }
        } finally { setTranscribing(false); }
      };
      mr.start();
      isRecordingRef.current = true;
      setIsRecording(true);
    } catch {
      alert("Microphone access denied. Please allow microphone access in your browser.");
    }
  }, [token]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    mediaRecorderRef.current?.stop();
    isRecordingRef.current = false;
    setIsRecording(false);
  }, []);

  // ── Spacebar toggle-to-talk ───────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (!audioModeRef.current) return;
      if (phaseRef.current !== "active") return;
      e.preventDefault();
      if (isRecordingRef.current) stopRecording(); else startRecording();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [startRecording, stopRecording]);

  // ── WebSocket message handler ─────────────────────────────────────────────────
  function handleMessage(msg: Record<string, unknown>) {
    setConnError(null);
    if (msg.error) {
      setConnError(String(msg.error));
      if (phaseRef.current === "connecting") setPhase("active");
      return;
    }
    if (msg.type === "greeting") {
      const text = String(msg.greeting);
      addMessage({ role: "interviewer", content: text, topic: "greeting" });
      setPhase("active");
      if (audioModeRef.current) speakText(text);
    } else if (msg.type === "question") {
      const text = String(msg.question);
      addMessage({ role: "interviewer", content: text, topic: String(msg.topic ?? "") });
      setPhase("active");
      if (audioModeRef.current) speakText(text);
    } else if (msg.type === "hint") {
      addMessage({ role: "hint", content: String(msg.hint) });
      setHintLoading(false);
    } else if (msg.type === "trial_limit") {
      addMessage({ role: "system", content: String(msg.message) });
      setPhase("trial_limit");
    } else if (msg.type === "complete") {
      setPhase("complete");
      // Clear persisted messages on completion
      try { localStorage.removeItem(MSG_KEY); } catch { /* ignore */ }
    }
  }

  // ── Connect function ──────────────────────────────────────────────────────────
  function connect(payload?: Record<string, string>) {
    if (wsRef.current) { wsRef.current.onerror = null; wsRef.current.onmessage = null; wsRef.current.close(); }
    const ws = new WebSocket(`${WS_URL}/interview/${sid}?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => {
      if (payload) ws.send(JSON.stringify(payload));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      handleMessage(msg);
      if (msg.type !== "report") ws.close();
    };
    // Only surface the error if this socket is still the active one (guards against
    // stale sockets from React StrictMode double-invoke or rapid re-connects).
    ws.onerror = () => { if (wsRef.current === ws) setConnError("Could not reach the server. Check your connection and try again."); };
  }

  function sendAnswer() {
    if (!input.trim() || phase !== "active") return;
    const answer = input.trim();
    setInput("");
    setConnError(null);
    addMessage({ role: "candidate", content: answer });
    connect({ answer });
  }

  function requestHint() {
    if (phase !== "active" || hintLoading) return;
    setHintLoading(true);
    const ws = new WebSocket(`${WS_URL}/interview/${sid}?token=${token}`);
    ws.onopen    = () => ws.send(JSON.stringify({ action: "hint", answer: input }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "hint") {
        addMessage({ role: "hint", content: String(msg.hint) });
      }
      setHintLoading(false);
      ws.close();
    };
    ws.onerror = () => { setHintLoading(false); setConnError("Could not fetch hint. Try again."); };
  }

  function endInterview() {
    if (wsRef.current) wsRef.current.close();
    setPhase("ending");
    const ws = new WebSocket(`${WS_URL}/interview/${sid}?token=${token}`);
    wsRef.current = ws;
    ws.onopen    = () => ws.send(JSON.stringify({ action: "end" }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "complete") { setPhase("complete"); ws.close(); }
      else if (msg.error) { setConnError(String(msg.error)); setPhase("active"); ws.close(); }
      // "report" follows before "complete" — keep open
    };
    ws.onerror = () => { if (wsRef.current === ws) { setConnError("Failed to end interview. Please try again."); setPhase("active"); } };
  }

  // ── Init on mount ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Practice mode detection
    const mode = localStorage.getItem("iq_session_mode");
    setIsPractice(mode === "practice");

    // Duration limit
    const mins = parseInt(localStorage.getItem("interview_duration_minutes") || "0", 10);
    if (mins > 0) setLimitSecs(mins * 60);

    // Restore messages persisted before refresh
    try {
      const saved = localStorage.getItem(MSG_KEY);
      if (saved) {
        const msgs: Message[] = JSON.parse(saved);
        if (msgs.length > 0) {
          setMessages(msgs);
          setPhase("active");
          // Send resume action to get back the current question
          connect({ action: "resume" });
          return;
        }
      }
    } catch { /* corrupt storage — ignore */ }

    // Fresh start
    connect();

    return () => {
      // Silence any in-flight callbacks when the component unmounts (or StrictMode
      // re-mounts). The stale-check in onerror also guards this, but nullifying
      // handlers here provides a belt-and-suspenders guarantee.
      if (wsRef.current) {
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Timer ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "active" && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    if ((phase === "complete" || phase === "trial_limit") && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {};
  }, [phase]);

  // Auto-end when countdown hits 0
  useEffect(() => {
    if (limitSecs !== null && elapsed >= limitSecs && phase === "active") endInterview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, limitSecs]);

  // Progress bar animation
  useEffect(() => {
    if (phase === "ending") {
      setReportProgress(0);
      const TOTAL = 35000, TICK = 300;
      let current = 0;
      progressRef.current = setInterval(() => {
        current += TICK;
        setReportProgress(Math.min(95, Math.round((current / TOTAL) * 100)));
      }, TICK);
    } else {
      if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
      if (phase === "complete") setReportProgress(100);
    }
  }, [phase]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Main interview area ── */}
      <div className="flex flex-col flex-1 min-w-0 px-4 py-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-xl font-bold">Interview Session</h1>
            {phase === "active" && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-sm font-mono font-semibold ${
                  limitSecs && (limitSecs - elapsed) <= 60 ? "text-red-500 animate-pulse" : "text-gray-500"
                }`}>
                  {limitSecs ? `⏱ ${fmt(Math.max(0, limitSecs - elapsed))} remaining` : `⏱ ${fmt(elapsed)}`}
                </span>
                {limitSecs && (
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (limitSecs - elapsed) / limitSecs < 0.2 ? "bg-red-500" : "bg-indigo-500"
                      }`}
                      style={{ width: `${Math.max(0, ((limitSecs - elapsed) / limitSecs) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isPractice && (
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                Practice
              </span>
            )}
            <button
              onClick={() => setAudioMode((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                audioMode
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300"
              }`}
            >
              🎙️ Voice {audioMode ? "ON" : "OFF"}
            </button>
            {(phase === "active" || phase === "ending") && (
              <button
                onClick={endInterview}
                disabled={phase === "ending"}
                className="bg-red-50 border border-red-200 text-red-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition"
              >
                {phase === "ending" ? "Generating report…" : "End Interview"}
              </button>
            )}
          </div>
        </div>

        {/* Error banner */}
        {connError && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-3 text-sm text-red-700">
            <span>⚠️ {connError}</span>
            <button onClick={() => setConnError(null)} className="ml-3 text-red-400 hover:text-red-600 text-xs font-medium">
              Dismiss
            </button>
          </div>
        )}

        {/* Chat */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-3 bg-white border rounded-xl p-4">
          {messages.length === 0 && phase === "connecting" && (
            <p className="text-center text-gray-400 text-sm py-8 animate-pulse">Connecting…</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "candidate" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] rounded-xl px-4 py-3 text-sm ${
                m.role === "interviewer"  ? "bg-indigo-50 text-gray-800"
                : m.role === "candidate" ? "bg-indigo-600 text-white"
                : m.role === "hint"      ? "bg-yellow-50 text-yellow-900 border border-yellow-200"
                : "bg-amber-50 text-amber-800 border border-amber-200 text-center w-full"
              }`}>
                {m.role === "hint" && (
                  <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-1">💡 Hint</p>
                )}
                {m.topic && m.role === "interviewer" && (
                  <p className="text-xs text-indigo-400 mb-1 font-medium uppercase tracking-wide">{m.topic}</p>
                )}
                <div className="flex items-start gap-2">
                  <span className="flex-1 whitespace-pre-wrap">{m.content}</span>
                  {m.role === "interviewer" && (
                    <button onClick={() => speakText(m.content)} title="Replay audio"
                      className="shrink-0 text-indigo-300 hover:text-indigo-600 transition mt-0.5">
                      🔊
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Status banners */}
        {phase === "ending" && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-3">
            <div className="flex justify-between text-sm text-indigo-700 font-medium mb-2">
              <span>Generating your report…</span>
              <span>{reportProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-indigo-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${reportProgress}%` }} />
            </div>
            <p className="text-xs text-indigo-400 mt-2 text-center">Evaluating answers and computing scores…</p>
          </div>
        )}
        {phase === "trial_limit" && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-center mb-3">
            <p className="font-semibold text-amber-800 mb-2">Free trial complete!</p>
            <a href="/pricing" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Buy Credits to Continue
            </a>
          </div>
        )}
        {phase === "complete" && (
          <div className="bg-green-50 border border-green-300 rounded-xl p-4 text-center mb-3">
            <p className="font-semibold text-green-800 mb-2">Interview complete!</p>
            <a href={`/reports/${sid}`} className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              View Full Report →
            </a>
          </div>
        )}

        {/* Input area */}
        {phase === "active" && (
          <div className="space-y-2">
            {audioMode && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => isRecording ? stopRecording() : startRecording()}
                  disabled={transcribing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition ${
                    isRecording
                      ? "bg-red-500 border-red-500 text-white animate-pulse"
                      : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                  } disabled:opacity-50`}
                >
                  {isRecording ? "🔴 Stop Recording" : "🎙️ Start Recording"}
                </button>
                <span className="text-xs text-gray-400 hidden sm:block">
                  or press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 font-mono text-xs">Space</kbd> to toggle
                </span>
                {transcribing && <span className="text-xs text-gray-400 animate-pulse">Transcribing…</span>}
                {speaking     && <span className="text-xs text-indigo-400 animate-pulse">🔊 Speaking…</span>}
                {/* Hint button — practice mode only */}
                {isPractice && (
                  <button
                    onClick={requestHint}
                    disabled={hintLoading}
                    className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 disabled:opacity-50 transition"
                  >
                    {hintLoading ? "…" : "💡 Hint"}
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAnswer(); } }}
                placeholder={audioMode
                  ? "Transcript appears here — review and edit, then press Send"
                  : "Type your answer… (Enter to send, Shift+Enter for new line)"}
                rows={3}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={sendAnswer}
                  disabled={!input.trim()}
                  className="bg-indigo-600 text-white px-5 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex-1 transition"
                >
                  Send
                </button>
                {/* Hint in text-only mode */}
                {isPractice && !audioMode && (
                  <button
                    onClick={requestHint}
                    disabled={hintLoading}
                    className="px-5 rounded-xl text-sm font-medium border border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 disabled:opacity-50 transition"
                  >
                    {hintLoading ? "…" : "💡"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
