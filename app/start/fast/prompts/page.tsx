"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProgress } from "@/lib/progress";
import FastSteps from "@/app/components/FastSteps";

const prompts = [
  "Describe a moment where you felt really engaged or ‘in flow.’",
  "What type of tasks give you energy instead of draining it?",
  "What matters most to you at work — e.g. creativity, impact, independence?",
];

export default function FastPromptsPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);

  const handleNext = () => {
    if (step < prompts.length - 1) {
      setStep(step + 1);
    } else {
      saveProgress({ track: "fast", stepId: "prompts", updatedAt: Date.now() });
      router.push("/start/fast/background");
    }
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <FastSteps />
      <h1 className="font-display text-neutrals-900 text-[24px] md:text-[28px] font-semibold mb-6">
        Quick Motivational Prompts
      </h1>
      <p className="text-neutrals-700 mb-4">{prompts[step]}</p>
      <textarea
        value={answers[step]}
        onChange={(e) => {
          const next = answers.slice();
          next[step] = e.target.value;
          setAnswers(next);
        }}
        rows={4}
        className="w-full rounded-xl border border-neutrals-300 p-3"
      />
      <button
        type="button"
        onClick={handleNext}
        className="mt-6 rounded-full bg-primary-500 text-[#2C2C2C] px-6 py-2 text-small font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500/60"
      >
        {step < prompts.length - 1 ? "Next" : "Continue"}
      </button>
    </main>
  );
}
