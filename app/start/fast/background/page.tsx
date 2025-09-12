"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProgress } from "@/lib/progress";

export default function BackgroundSnapshotPage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [education, setEducation] = useState("");
  const [aspiration, setAspiration] = useState("");

  const handleNext = () => {
    saveProgress({ track: "fast", stepId: "background", updatedAt: Date.now() });
    router.push("/start/fast/processing");
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-neutrals-900 text-[24px] md:text-[28px] font-semibold mb-6">Background Snapshot</h1>
      <div className="space-y-4">
        <label className="block">
          <span className="text-small text-neutrals-700">Current status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutrals-300 p-2"
          >
            <option value="" disabled>Select status</option>
            <option>student</option>
            <option>early-career</option>
            <option>mid-career</option>
          </select>
        </label>
        <label className="block">
          <span className="text-small text-neutrals-700">Current/last role or study field</span>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutrals-300 p-2"
          />
        </label>
        <label className="block">
          <span className="text-small text-neutrals-700">Highest education level (optional)</span>
          <select
            value={education}
            onChange={(e) => setEducation(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutrals-300 p-2"
          >
            <option value="">Select level</option>
            <option>High school</option>
            <option>Bachelor's</option>
            <option>Master's</option>
            <option>Doctorate</option>
          </select>
        </label>
        <label className="block">
          <span className="text-small text-neutrals-700">If I could explore anything next, it would be…</span>
          <input
            type="text"
            value={aspiration}
            onChange={(e) => setAspiration(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutrals-300 p-2"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={handleNext}
        className="mt-6 rounded-full bg-primary-500 text-[#2C2C2C] px-6 py-2 text-small font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500/60"
      >
        Continue
      </button>
    </main>
  );
}
