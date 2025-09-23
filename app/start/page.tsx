"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProgress, getResumeUrl, type Progress } from "@/lib/progress";
import { createClient } from "@/utils/supabase/client";

export default function StartPage() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [hasServerProgress, setHasServerProgress] = useState<boolean>(false);
  useEffect(() => { setProgress(getProgress()); }, []);
  useEffect(() => {
    // Check Supabase for any saved journeys for this user
    const check = async () => {
      try {
        const supabase = createClient();
        // count only, head request; RLS restricts to current user
        const { count, error } = await supabase
          .from("journeys")
          .select("id", { count: "exact", head: true });
        if (error) return;
        setHasServerProgress(!!(count && count > 0));
      } catch {}
    };
    check();
  }, []);

  const deepAnalysisButtonLabel = hasServerProgress ? "Continue Deep Analysis" : "Start Deep Analysis";
  const deepAnalysisButtonHref = hasServerProgress
    ? (progress ? getResumeUrl(progress) : "/")
    : "/";
  const deepAnalysisButtonClasses = hasServerProgress
    ? "bg-white text-[#2C2C2C]"
    : "bg-primary-500 text-[#2C2C2C]";

  return (
    <main className="min-h-screen px-4 py-8 md:py-12">
      {/* Hero */}
      <section className="mx-auto max-w-5xl text-center">
        <h1 className="font-display text-neutrals-900 text-[28px] md:text-[40px] font-semibold">
          Find your next step, your way.
        </h1>
        <p className="mt-2 text-neutrals-700">
          Go fast for a quick snapshot or go deep for a full analysis.
        </p>
      </section>

      {/* Track cards */}
      <section className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        {/* Fast Track Card (container not clickable) */}
        <div className="relative min-h-80 overflow-hidden rounded-3xl border border-accent-700 focus-within:ring-4 focus-within:ring-primary-500/40">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/Fast track picture.jpg')" }}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-black/50" />
          <div className="relative flex min-h-80 flex-col p-6 md:p-8">
            <div className="flex items-start justify-between text-white">
              <h3 className="font-semibold text-[20px] text-white">Fast Track</h3>
              <span className="rounded-full bg-white/20 px-3 py-1 text-small text-white" aria-label="Estimated time 10 to 15 minutes">10–15 min</span>
            </div>
            <p className="mt-3 text-small text-white/90 max-w-xs">
              Get 3 tailored roles, skill priorities, and an action you can take right away.
            </p>
            <div className="mt-auto pt-4">
              <Link
                href="/start/fast"
                aria-label="Start Fast Track"
                className="w-full inline-flex justify-center items-center gap-2 rounded-full bg-primary-500 text-[#2C2C2C] px-4 py-2 text-small font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500/60"
              >
                Start Fast Track
              </Link>
              <p className="mt-3 text-xs text-white/80">Your data is private. You control what’s saved.</p>
            </div>
          </div>
        </div>

        {/* Deep Analysis Card (container not clickable) */}
        <div className="relative min-h-80 overflow-hidden rounded-3xl border border-accent-700 focus-within:ring-4 focus-within:ring-primary-500/40">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/Deeo analysis picture.jpg')" }}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-black/60" />
          <div className="relative flex min-h-80 flex-col p-6 md:p-8">
            <div className="flex items-start justify-between text-white">
              <h3 className="font-semibold text-[20px] text-white">Deep Analysis</h3>
              <span className="rounded-full bg-white/20 px-3 py-1 text-small text-white" aria-label="Estimated time 45 to 60 minutes">45–60 min</span>
            </div>
            <p className="mt-3 text-small text-white/90 max-w-sm">
              Dive into your stories to surface themes, map long-term paths, and shape a tailored development plan.
            </p>
            <div className="mt-auto pt-4 space-y-3">
              <Link
                href={deepAnalysisButtonHref}
                aria-label={deepAnalysisButtonLabel}
                className={`w-full inline-flex justify-center items-center gap-2 rounded-full px-4 py-2 text-small font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500/60 ${deepAnalysisButtonClasses}`}
              >
                {deepAnalysisButtonLabel}
              </Link>
              <p className="text-xs text-white/80">Your data is private. You control what’s saved.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
