"use client";

import { saveProgress } from "@/lib/progress";

export default function DeepAnalysisPlaceholder() {
  return (
    <main className="min-h-screen px-4 py-8">
      <h1 className="font-display text-neutrals-900 text-[28px] md:text-[32px] font-semibold">Deep Analysis (placeholder)</h1>
      <p className="mt-2 text-neutrals-700">Starter view. Replace with actual deep flow.</p>
      <button
        type="button"
        onClick={() => saveProgress({ track: "deep", stepId: "welcome", updatedAt: Date.now() })}
        className="mt-6 rounded-full bg-primary-500 text-[#2C2C2C] px-4 py-2 text-small font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500/60"
        aria-label="Save demo progress"
      >
        Save demo progress
      </button>
    </main>
  );
}
