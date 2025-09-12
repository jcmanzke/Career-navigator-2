"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveProgress } from "@/lib/progress";

export default function FastProcessingPage() {
  const router = useRouter();

  useEffect(() => {
    saveProgress({ track: "fast", stepId: "processing", updatedAt: Date.now() });
    const t = setTimeout(() => router.push("/start/fast/results"), 2000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 text-center">
      <div className="h-16 w-16 rounded-full border-4 border-primary-500 border-t-transparent animate-spin mb-6" />
      <p className="max-w-md text-neutrals-700">
        Analyzing your responses… Matching your themes with career paths in demand…
      </p>
    </main>
  );
}
