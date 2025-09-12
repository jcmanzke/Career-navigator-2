"use client";

import { useEffect } from "react";
import { saveProgress } from "@/lib/progress";
import FastSteps from "@/app/components/FastSteps";

export default function FastResultsPage() {
  useEffect(() => {
    saveProgress({ track: "fast", stepId: "results", updatedAt: Date.now() });
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      <FastSteps />
      <section>
        <h2 className="font-display text-[20px] font-semibold mb-4">Top 3 Motivational Themes</h2>
        <ul className="space-y-3">
          <li className="rounded-xl bg-neutrals-100 p-4">Analytical Problem-Solving — you thrive when breaking down complex challenges.</li>
          <li className="rounded-xl bg-neutrals-100 p-4">Collaboration &amp; Teamwork — working with others energizes you.</li>
          <li className="rounded-xl bg-neutrals-100 p-4">Independence — you value autonomy and owning your projects.</li>
        </ul>
      </section>
      <section>
        <h2 className="font-display text-[20px] font-semibold mb-4">Suggested Career Paths</h2>
        <ul className="space-y-3">
          <li className="rounded-xl bg-neutrals-100 p-4"><strong>Data Analyst</strong> — €52k avg. Uses problem-solving and data skills to support business decisions.</li>
          <li className="rounded-xl bg-neutrals-100 p-4"><strong>Product Designer</strong> — €58k avg. Combines creativity and collaboration to craft user-centered products.</li>
          <li className="rounded-xl bg-neutrals-100 p-4"><strong>Project Manager</strong> — €60k avg. Leads teams and drives outcomes with structured planning.</li>
        </ul>
      </section>
      <section>
        <h2 className="font-display text-[20px] font-semibold mb-4">Micro Action Ideas</h2>
        <ul className="space-y-2 list-disc pl-5 text-neutrals-700">
          <li>Try a 1-hour SQL basics course</li>
          <li>Shadow a product manager at your company</li>
          <li>Join a local meetup focused on design thinking</li>
        </ul>
      </section>
    </main>
  );
}
