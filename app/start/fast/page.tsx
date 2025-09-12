"use client";

import { useEffect, useMemo, useState } from "react";
import { saveProgress } from "@/lib/progress";

function cls(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function ProgressSteps3({ current, onSelect }: { current: number; onSelect?: (n: number) => void }) {
  const steps = [1, 2, 3];
  const pct = Math.round(((current - 1) / 3) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-3 mb-2">
        {steps.map((n) => (
          <div key={n} className="flex items-center">
            <button
              type="button"
              onClick={() => onSelect?.(n)}
              className={cls(
                "h-8 w-8 rounded-full flex items-center justify-center text-small font-medium focus:outline-none",
                n < current
                  ? "bg-semantic-success-base text-neutrals-0"
                  : n === current
                  ? "bg-primary-500 text-neutrals-0"
                  : "bg-neutrals-200 text-neutrals-600",
              )}
              title={`Schritt ${n}`}
            >
              {n}
            </button>
            {n !== 3 && <div className="w-6 h-1 mx-2 rounded bg-neutrals-200" />}
          </div>
        ))}
      </div>
      <div className="h-2 bg-neutrals-200 rounded-full">
        <div className="h-2 bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-center text-small text-neutrals-500 mt-1">Fortschritt: {pct}%</p>
    </div>
  );
}

export default function FastTrack() {
  // step: 0 = Intro (not part of progress), 1..3 are the steps
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  useEffect(() => {
    const id = step === 0 ? "intro" : `step-${step}`;
    saveProgress({ track: "fast", stepId: id, updatedAt: Date.now() });
  }, [step]);

  // Dummy webhook results we will replace later
  const dummyData = useMemo(
    () => ({
      summary: "Vorläufige Ergebnisse des Fast-Track Flows",
      profile:
        {
          strengths: ["Analytisches Denken", "Teamführung", "Kommunikation"],
          focusAreas: ["Produktstrategie", "Stakeholder-Management"],
        },
      suggestions: [
        { title: "Rolle", value: "Senior Product Manager" },
        { title: "Nächster Schritt", value: "Portfolio zusammenstellen" },
      ],
    }),
    [],
  );

  const generate = async () => {
    setLoading(true);
    setResults(null);
    // Simulate request/stream. Later replaced by webhook handling.
    setTimeout(() => {
      setLoading(false);
      setResults(dummyData);
    }, 1500);
  };

  return (
    <main className="min-h-screen px-4 py-8">
      {step === 0 && (
        <section className="max-w-3xl mx-auto rounded-3xl border border-neutrals-200/60 bg-neutrals-0/60 backdrop-blur-md shadow-elevation2 p-6">
          <h1 className="font-display text-neutrals-900 text-[28px] md:text-[32px] font-semibold">Fast Track</h1>
          <p className="mt-2 text-neutrals-700">Kompakter Ablauf in drei Schritten.</p>
          <ol className="list-decimal pl-5 text-body text-neutrals-700 space-y-1 mt-4">
            <li>Basisinfos</li>
            <li>Bestätigung</li>
            <li>Ergebnisse generieren</li>
          </ol>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mt-6 rounded-xl bg-[#1D252A] text-white px-4 py-2 text-small font-semibold hover:bg-primary-500 hover:text-neutrals-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500/60"
          >
            Starten
          </button>
        </section>
      )}

      {step >= 1 && (
        <div className="max-w-4xl mx-auto space-y-6">
          <ProgressSteps3 current={step} onSelect={(n) => setStep(n)} />

          {step === 1 && (
            <section className="rounded-3xl border border-neutrals-200/60 bg-neutrals-0/60 backdrop-blur-md shadow-elevation2 p-6">
              <h2 className="text-lg font-semibold mb-2">Schritt 1: Basisinfos</h2>
              <p className="text-neutrals-700">Platzhalterinhalt – hier kommen die Eingaben für den Fast‑Track hin.</p>
              <div className="flex justify-end pt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl bg-[#1D252A] text-white hover:bg-primary-500 hover:text-neutrals-900"
                >
                  Weiter
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="rounded-3xl border border-neutrals-200/60 bg-neutrals-0/60 backdrop-blur-md shadow-elevation2 p-6">
              <h2 className="text-lg font-semibold mb-2">Schritt 2: Bestätigung</h2>
              <p className="text-neutrals-700">Kurz prüfen und bestätigen. Danach werden die Ergebnisse erzeugt.</p>
              <div className="flex justify-between pt-6">
                <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl border">Zurück</button>
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 rounded-xl bg-[#1D252A] text-white hover:bg-primary-500 hover:text-neutrals-900"
                >
                  Weiter
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="rounded-3xl border border-neutrals-200/60 bg-neutrals-0/60 backdrop-blur-md shadow-elevation2 p-10 flex flex-col items-center text-center">
              <h2 className="text-lg font-semibold mb-6">Schritt 3: Ergebnisse generieren</h2>

              <button
                type="button"
                disabled={loading}
                onClick={generate}
                className={cls(
                  "group relative inline-flex items-center justify-center w-full max-w-md h-16",
                  "rounded-2xl bg-primary-500 text-[#2C2C2C] font-semibold text-[18px]",
                  "transition-all duration-150 ease-out shadow-elevation2 hover:shadow-elevation3",
                  "active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500/60",
                  loading && "opacity-80 cursor-not-allowed",
                )}
              >
                <span className="pointer-events-none">{loading ? "Generiere…" : "Ergebnisse generieren"}</span>
                {/* subtle click ripple */}
                <span className="absolute inset-0 rounded-2xl opacity-0 group-active:opacity-100 bg-white/20 transition-opacity" />
                {loading && (
                  <span className="absolute right-4 h-5 w-5 border-2 border-[#2C2C2C]/40 border-t-[#2C2C2C] rounded-full animate-spin" />
                )}
              </button>

              <div className="mt-8 w-full max-w-3xl text-left">
                {results && (
                  <div className="rounded-2xl border border-neutrals-200 bg-neutrals-0 p-4 overflow-auto">
                    <pre className="text-small leading-relaxed whitespace-pre-wrap">{JSON.stringify(results, null, 2)}</pre>
                  </div>
                )}
                {!results && !loading && (
                  <p className="text-neutrals-600">Klicke auf „Ergebnisse generieren“, um die Demo‑Ausgabe zu sehen.</p>
                )}
              </div>

              <div className="flex justify-start w-full max-w-3xl pt-8">
                <button onClick={() => setStep(2)} className="px-4 py-2 rounded-xl border">Zurück</button>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
