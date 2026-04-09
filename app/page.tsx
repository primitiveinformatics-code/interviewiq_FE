"use client";
import { getBasePath, hardNav } from "@/lib/nav";

export default function LandingPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 text-center">
      <h1 className="text-3xl sm:text-5xl font-bold text-indigo-600 mb-6">
        Ace Your Technical Interview
      </h1>
      <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
        InterviewIQ uses AI to simulate real technical interviews — tailored to your
        job description and resume, with detailed feedback on every answer.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href={getBasePath() + "/login"}
          onClick={(e) => { e.preventDefault(); hardNav("/login"); }}
          className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
        >
          Start Free Trial
        </a>
        <a
          href={getBasePath() + "/pricing"}
          onClick={(e) => { e.preventDefault(); hardNav("/pricing"); }}
          className="border border-indigo-600 text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition"
        >
          View Pricing
        </a>
      </div>

      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
        {[
          { title: "Real Interview Questions", desc: "AI generates questions based on your actual JD and resume — no generic questions." },
          { title: "Multi-Model Evaluation", desc: "Your answers are scored across 5 dimensions: accuracy, depth, problem-solving, communication, and confidence." },
          { title: "Instant PDF Report", desc: "Get a detailed scorecard after every session, downloadable as PDF." },
        ].map((f) => (
          <div key={f.title} className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-gray-600 text-sm">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
