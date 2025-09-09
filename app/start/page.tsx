"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProgress, getResumeUrl, type Progress } from "@/lib/progress";

export default function StartPage() {
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => { setProgress(getProgress()); }, []);

  return (
    <main className="min-h-screen px-4 py-8 md:py-12">
      {/* Hero */}
      <section className="mx-auto max-w-4xl text-center">
        <h1 className="font-display text-neutrals-900 text-[28px] md:text-[40px] font-semibold">
          Find your next step, your way.
        </h1>
        <p className="mt-2 text-neutrals-700">
          Go fast for a quick snapshot or go deep for a full analysis.
        </p>
      </section>

      {/* Continue tile */}
      {progress && (
        <section className="mx-auto mt-8 max-w-4xl">
          <Link
            href={getResumeUrl(progress)}
            className="group block rounded-3xl border border-accent-700 bg-neutrals-0/80 p-4 md:p-5 shadow-elevation2 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/40"
            aria-label="Continue your journey"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-neutrals-900">Continue your journey</h2>
                <p className="text-small text-neutrals-600">Resume</p>
              </div>
              <span className="text-small text-neutrals-600">Last step: {progress.stepId}</span>
            </div>
          </Link>
        </section>
      )}

      {/* Track cards */}
      <section className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
        {/* Fast Track Card */}
        <Link
          href="/start/fast"
          className="group relative rounded-3xl bg-neutrals-100 p-5 md:p-6 border border-accent-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/40"
          aria-label="Start Fast Track"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-neutrals-0/0 to-neutrals-0/0 pointer-events-none" />
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-neutrals-900 text-[20px]">Fast Track</h3>
            <span className="rounded-full bg-neutrals-200 px-3 py-1 text-small text-neutrals-800" aria-label="Estimated time 10 to 15 minutes">10–15 min</span>
          </div>
          <ul className="mt-3 list-disc pl-5 text-small text-neutrals-700 space-y-1">
            <li>3 role ideas tailored to you</li>
            <li>2 skills to build next</li>
            <li>1 action you can take today</li>
          </ul>
          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs text-neutrals-600">Your data is private. You control what’s saved.</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-500 text-[#2C2C2C] px-4 py-2 text-small font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500/60">
              Start Fast Track
            </span>
          </div>
        </Link>

        {/* Deep Analysis Card */}
        <Link
          href="/start/deep"
          className="group relative rounded-3xl bg-neutrals-100 p-5 md:p-6 border border-accent-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/40"
          aria-label="Start Deep Analysis"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-neutrals-0/0 to-neutrals-0/0 pointer-events-none" />
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-neutrals-900 text-[20px]">Deep Analysis</h3>
            <span className="rounded-full bg-neutrals-200 px-3 py-1 text-small text-neutrals-800" aria-label="Estimated time 45 to 60 minutes">45–60 min</span>
          </div>
          <ul className="mt-3 list-disc pl-5 text-small text-neutrals-700 space-y-1">
            <li>Themes & values from your stories</li>
            <li>Personalized role paths</li>
            <li>Development plan (in/outside company, freelance)</li>
          </ul>
          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs text-neutrals-600">Your data is private. You control what’s saved.</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-500 text-[#2C2C2C] px-4 py-2 text-small font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500/60">
              Start Deep Analysis
            </span>
          </div>
        </Link>
      </section>

      {/* Social proof strip */}
      <section className="mx-auto mt-10 max-w-4xl" aria-label="Social proof">
        <div className="flex flex-wrap items-center justify-center gap-6 text-neutrals-600 text-small">
          <span>Trusted by professionals at</span>
          <span className="rounded bg-neutrals-100 px-3 py-1">Acme Co</span>
          <span className="rounded bg-neutrals-100 px-3 py-1">Globex</span>
          <span className="rounded bg-neutrals-100 px-3 py-1">Initech</span>
          <span className="rounded bg-neutrals-100 px-3 py-1">Umbrella</span>
        </div>
      </section>
    </main>
  );
}

