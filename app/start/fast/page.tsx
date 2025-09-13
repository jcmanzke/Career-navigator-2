"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { saveProgress } from "@/lib/progress";
import { createClient } from "@/utils/supabase/client";

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

type Basics = {
  background: string;
  current: string;
  goals: string;
};

export default function FastTrack() {
  // step: 0 = Intro (not part of progress), 1..3 are the steps
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [basics, setBasics] = useState<Basics>({ background: "", current: "", goals: "" });
  const [saving, setSaving] = useState<"idle" | "saving">("idle");

  useEffect(() => {
    const id = step === 0 ? "intro" : `step-${step}`;
    saveProgress({ track: "fast", stepId: id, updatedAt: Date.now() });
  }, [step]);

  // Fetch or initialize the user's fast-scan session on login
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // unauthenticated view stays client-only
        setUserId(user.id);
        // Load session
        const { data: row } = await supabase
          .from("fast_scan_sessions")
          .select("id, step, basics, results")
          .eq("user_id", user.id)
          .single();
        if (row) {
          setSessionId(row.id);
          setStep(row.step ?? 1);
          if (row.basics) setBasics({ background: row.basics.background || "", current: row.basics.current || "", goals: row.basics.goals || "" });
          if (row.results) setResults(row.results);
        } else {
          // create an empty session for this user
          const { data: created, error } = await supabase
            .from("fast_scan_sessions")
            .insert({ user_id: user.id, step: 1, basics: {}, results: null })
            .select()
            .single();
          if (!error && created) {
            setSessionId(created.id);
            setStep(created.step ?? 1);
          }
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const upsertSession = useCallback(
    async (patch: Partial<{ step: number; basics: Basics; results: any }>) => {
      if (!userId) return;
      try {
        setSaving("saving");
        const supabase = createClient();
        const payload: any = { user_id: userId };
        if (typeof patch.step === "number") payload.step = patch.step;
        if (patch.basics) payload.basics = patch.basics;
        if ("results" in patch) payload.results = patch.results;
        const { data } = await supabase
          .from("fast_scan_sessions")
          .upsert(payload, { onConflict: "user_id" })
          .select()
          .single();
        if (data?.id) setSessionId(data.id);
      } catch (e) {
        console.error(e);
      } finally {
        setSaving("idle");
      }
    },
    [userId],
  );

  // Auto-save basics with debounce while typing
  useEffect(() => {
    if (!userId || step < 1) return;
    const t = setTimeout(() => {
      upsertSession({ basics });
    }, 600);
    return () => clearTimeout(t);
  }, [basics, userId, step, upsertSession]);

  // Fallback results used if webhook fails
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
    try {
      const res = await fetch(
        "https://chrismzke.app.n8n.cloud/webhook-test/4646f17e-7ee3-40b8-b78e-fe9c59d31620",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, sessionId, basics }),
        },
      );
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        data = { summary: text };
      }
      setResults(data);
      upsertSession({ results: data });
    } catch (e) {
      console.error(e);
      setResults(dummyData);
      upsertSession({ results: dummyData });
    } finally {
      setLoading(false);
    }
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
          <ProgressSteps3 current={step} onSelect={(n) => { setStep(n); upsertSession({ step: n }); }} />

          {step === 1 && (
            <section className="rounded-3xl border border-neutrals-200/60 bg-neutrals-0/60 backdrop-blur-md shadow-elevation2 p-6">
              <h2 className="text-lg font-semibold mb-2">Schritt 1: Basisinfos</h2>
              <p className="text-neutrals-700 mb-4">Kurze Angaben, damit wir eine schnelle Einschätzung erstellen können.</p>
              <div className="space-y-3">
                <input
                  className="w-full h-12 px-4 rounded-2xl border border-accent-700"
                  placeholder="Beruflicher Hintergrund"
                  value={basics.background}
                  onChange={(e) => setBasics((b) => ({ ...b, background: e.target.value }))}
                />
                <input
                  className="w-full h-12 px-4 rounded-2xl border border-accent-700"
                  placeholder="Aktuelle Rolle"
                  value={basics.current}
                  onChange={(e) => setBasics((b) => ({ ...b, current: e.target.value }))}
                />
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl border border-accent-700"
                  placeholder="Ziele/Interessen (kurz)"
                  value={basics.goals}
                  onChange={(e) => setBasics((b) => ({ ...b, goals: e.target.value }))}
                />
              </div>
              <div className="flex justify-end pt-6">
                <button
                  onClick={async () => {
                    await upsertSession({ step: 2, basics });
                    setStep(2);
                  }}
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
              <p className="text-neutrals-700 mb-4">Kurz prüfen und bestätigen. Danach werden die Ergebnisse erzeugt.</p>
              <div className="rounded-2xl border p-4 bg-neutrals-0">
                <div className="text-small text-neutrals-500 mb-1">Beruflicher Hintergrund</div>
                <div className="mb-3">{basics.background || "—"}</div>
                <div className="text-small text-neutrals-500 mb-1">Aktuelle Rolle</div>
                <div className="mb-3">{basics.current || "—"}</div>
                <div className="text-small text-neutrals-500 mb-1">Ziele/Interessen</div>
                <div className="whitespace-pre-wrap">{basics.goals || "—"}</div>
              </div>
              <div className="flex justify-between pt-6">
                <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl border">Zurück</button>
                <button
                  onClick={async () => {
                    await upsertSession({ step: 3, basics });
                    setStep(3);
                  }}
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

              <div className="flex justify-between w-full max-w-3xl pt-8">
                <button onClick={() => setStep(2)} className="px-4 py-2 rounded-xl border">Zurück</button>
                <div className="text-small text-neutrals-500 self-center">{saving === "saving" ? "Speichere…" : "Gespeichert"}</div>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
