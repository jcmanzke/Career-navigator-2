"use client";

import Link from "next/link";
import { useEffect } from "react";
import { saveProgress } from "@/lib/progress";

export default function FastScanWelcome() {
  useEffect(() => {
    saveProgress({ track: "fast", stepId: "welcome", updatedAt: Date.now() });
  }, []);

  return (
    <main className="min-h-screen px-4 py-8 md:py-12 flex flex-col items-center justify-center text-center">
      <h1 className="font-display text-neutrals-900 text-[28px] md:text-[32px] font-semibold">
        Welcome to your Career Fast Scan
      </h1>
      <p className="mt-4 max-w-xl text-neutrals-700">
        In the next 10 minutes, you’ll get a personalized snapshot of your strengths, values, and potential career development paths. Just answer a few quick prompts — we’ll do the rest.
      </p>
      <Link
        href="/start/fast/prompts"
        className="mt-8 rounded-full bg-primary-500 text-[#2C2C2C] px-6 py-3 text-small font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500/60"
        aria-label="Start Fast Scan"
      >
        Start My Fast Scan
      </Link>
    </main>
  );
}
