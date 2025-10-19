"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveProgress } from "@/lib/progress";
import { createClient } from "@/utils/supabase/client";
import ReactMarkdown from "react-markdown";
import { CONTEXT_HEADER_NAME, FAST_TRACK_STEP3_CONTEXT } from "@/lib/n8n";
import { Basics, FieldKey, HistoryRecord, emptyHistory, normalizeHistory, sanitizePlainText } from "./shared";

function cls(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const STEP3_CHAT_HEADER_NAME = "X-Fast-Track-Origin";
const STEP3_CHAT_HEADER_VALUE = "fast-track-step-3-chat";

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
  const router = useRouter();
  // step: 1..3 are the active screens; intro screen removed for faster start
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [basics, setBasics] = useState<Basics>({ background: "", current: "", goals: "" });
  const [history, setHistory] = useState<HistoryRecord>(emptyHistory);
  const [saving, setSaving] = useState<"idle" | "saving">("idle");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "assistant" | "user"; content: string }[]>([]);
  const [agentResponse, setAgentResponse] = useState<string>("");
  const step3ChatHeaderName = "X-Fast-Track-Origin";
  const step3ChatHeaderValue = "fast-track-step-3-chat";

  useEffect(() => {
    const id = `step-${Math.max(1, step)}`;
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
          .select("id, step, basics, history, results")
          .eq("user_id", user.id)
          .single();
        if (row) {
          setSessionId(row.id);
          const nextStep = typeof row.step === "number" && row.step >= 1 ? row.step : 1;
          setStep(nextStep);
          if (row.basics)
            setBasics({
              background: sanitizePlainText(row.basics.background || ""),
              current: sanitizePlainText(row.basics.current || ""),
              goals: sanitizePlainText(row.basics.goals || ""),
            });
          if (row.history) setHistory(normalizeHistory(row.history));
          if (row.results) setResults(row.results);
        } else {
          // create an empty session for this user
          const { data: created, error } = await supabase
            .from("fast_scan_sessions")
            .insert({ user_id: user.id, step: 1, basics: {}, history: {}, results: null })
            .select()
            .single();
          if (!error && created) {
            setSessionId(created.id);
            const nextStep = typeof created.step === "number" && created.step >= 1 ? created.step : 1;
            setStep(nextStep);
          }
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const upsertSession = useCallback(
    async (patch: Partial<{ step: number; basics: Basics; history: HistoryRecord; results: any }>) => {
      if (!userId) return;
      try {
        setSaving("saving");
        const supabase = createClient();
        const payload: any = { user_id: userId };
        if (typeof patch.step === "number") payload.step = patch.step;
        if (patch.basics) payload.basics = patch.basics;
        if (patch.history) payload.history = patch.history;
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
      upsertSession({ basics, history });
    }, 600);
    return () => clearTimeout(t);
  }, [basics, history, userId, step, upsertSession]);

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
      const res = await fetch("/api/fast-track-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CONTEXT_HEADER_NAME]: FAST_TRACK_STEP3_CONTEXT,
          [STEP3_CHAT_HEADER_NAME]: STEP3_CHAT_HEADER_VALUE,
        },
        body: JSON.stringify({ userId, sessionId, basics, history }),
      });
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
      {step >= 1 && (
        <div className="max-w-4xl mx-auto space-y-6">
          <ProgressSteps3 current={step} onSelect={(n) => { setStep(n); upsertSession({ step: n }); }} />

          {step === 1 && (
            <section className="rounded-3xl border border-neutrals-200/60 bg-neutrals-0/60 backdrop-blur-md shadow-elevation2 p-6">
              <h2 className="text-lg font-semibold mb-2">Schritt 1: Basisinfos</h2>
              <p className="text-neutrals-700 mb-4">Statt Tippen: per Stimme aufnehmen. Jede Eingabe öffnet ein Pop‑up zur Sprachaufnahme.</p>
              <div className="grid gap-4 md:grid-cols-3">
                {(([
                  { key: "background", label: "Ausbildung und beruflicher Hintergrund" },
                  { key: "current", label: "Aktuelle Rolle" },
                  { key: "goals", label: "Ziele und Interessen" },
                ] as { key: FieldKey; label: string }[])).map((item) => {
                  const entries = history[item.key] ?? [];
                  const latestEntry = entries[entries.length - 1];
                  const hasRecording = Boolean(latestEntry?.text || (basics as any)[item.key]);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => router.push(`/start/fast/record/${item.key}`)}
                      className={cls(
                        "group flex flex-col justify-between rounded-2xl border border-neutrals-200 bg-neutrals-0 p-4 text-left shadow-sm transition-transform",
                        "hover:shadow-elevation3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                      )}
                      aria-label={`Aufnahme starten: ${item.label}`}
                    >
                      <span className="text-base font-medium text-neutrals-900">{item.label}</span>
                      <div className="mt-6 flex items-center gap-3 text-sm font-semibold text-primary-600">
                        <span
                          className={cls(
                            "flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary-200 bg-primary-100 text-2xl transition-transform group-hover:scale-105",
                            hasRecording && "border-semantic-success-base bg-semantic-success-surface text-semantic-success-base",
                          )}
                          aria-hidden="true"
                        >
                          {hasRecording ? "✅" : "🎙️"}
                        </span>
                        <span className="text-neutrals-900">Aufnehmen</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end pt-6">
                <button
                  onClick={async () => {
                    await upsertSession({ step: 2, basics, history });
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
                <div className="text-small text-neutrals-500 mb-1">Ausbildung und beruflicher Hintergrund</div>
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
                    await upsertSession({ step: 3, basics, history });
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
            <section className="rounded-3xl border border-neutrals-200/60 bg-neutrals-0/60 backdrop-blur-md shadow-elevation2 p-0 md:p-6 flex flex-col">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">Schritt 3: Ergebnisse generieren</h2>
                <p className="text-neutrals-600 mt-1">Erzeugt ein Ergebnis basierend auf deinen Eingaben. Ergebnis erscheint darunter im Chat.</p>
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={chatLoading}
                    onClick={async () => {
                      setChatLoading(true);
                      setChatMessages([]);
                      setAgentResponse("");
                      try {
                        const payload = { summary: basics };
                        const res = await fetch("/api/fast-track-webhook", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            [CONTEXT_HEADER_NAME]: FAST_TRACK_STEP3_CONTEXT,
                            [STEP3_CHAT_HEADER_NAME]: STEP3_CHAT_HEADER_VALUE,
                          },
                          body: JSON.stringify({ ...payload, history }),
                        });
                        const text = await res.text();
                        setChatMessages([{ role: "assistant", content: text }]);
                        setAgentResponse(text);
                      } catch (e) {
                        const fallback = "Fehler beim Abrufen der Ergebnisse.";
                        setAgentResponse(fallback);
                        setChatMessages([{ role: "assistant", content: fallback }]);
                      } finally {
                        setChatLoading(false);
                      }
                    }}
                    className={cls(
                      "group relative inline-flex items-center justify-center w-full md:w-auto h-12 px-4",
                      "rounded-2xl bg-primary-500 text-[#2C2C2C] font-semibold",
                      chatLoading && "opacity-80 cursor-not-allowed",
                    )}
                  >
                    {chatLoading ? "Verarbeite…" : "Ergebnisse generieren"}
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-[50vh] max-h-[70vh] overflow-y-auto p-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="agent-response" className="block text-sm font-medium text-neutrals-700">
                    Antwort der KI
                  </label>
                  <textarea
                    id="agent-response"
                    value={agentResponse}
                    readOnly
                    placeholder="Die Antworten der KI erscheinen hier."
                    className="w-full min-h-[96px] rounded-2xl border border-neutrals-200 bg-neutrals-0 px-3 py-2 text-sm text-neutrals-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  />
                </div>
                {chatLoading && (
                  <div className="flex items-center gap-3 text-neutrals-600">
                    <span className="h-4 w-4 border-2 border-neutrals-400 border-t-transparent rounded-full animate-spin" />
                    <span>Verarbeite…</span>
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} className={cls("rounded-2xl p-3", m.role === "assistant" ? "bg-neutrals-50" : "bg-primary-50")}> 
                    <ReactMarkdown className="prose prose-sm max-w-none">{m.content}</ReactMarkdown>
                  </div>
                ))}
              </div>

              <div className="sticky bottom-0 bg-white border-t px-4 py-3 md:px-6">
                <div className="mx-auto w-full max-w-full sm:max-w-3xl space-y-3 pb-[max(0px,env(safe-area-inset-bottom))]">
                  <form
                    className="flex w-full items-center gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const input = form.elements.namedItem("msg") as HTMLInputElement;
                      const value = input.value.trim();
                      if (!value) return;
                      setChatMessages((msgs) => [...msgs, { role: "user", content: value }]);
                      input.value = "";
                      try {
                        const res = await fetch("/api/fast-track-webhook", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            [CONTEXT_HEADER_NAME]: FAST_TRACK_STEP3_CONTEXT,
                            [STEP3_CHAT_HEADER_NAME]: STEP3_CHAT_HEADER_VALUE,
                          },
                          body: JSON.stringify({ summary: basics, followup: value, history }),
                        });
                        const text = await res.text();
                        setChatMessages((msgs) => [...msgs, { role: "assistant", content: text }]);
                        setAgentResponse(text);
                      } catch (e) {
                        const errorResponse = "Fehler beim Abrufen der Antwort.";
                        setAgentResponse(errorResponse);
                        setChatMessages((msgs) => [...msgs, { role: "assistant", content: errorResponse }]);
                      }
                    }}
                  >
                    <input
                      name="msg"
                      placeholder="Nachricht eingeben…"
                      className="flex-1 min-w-0 h-12 px-3 rounded-xl border"
                    />
                    <button type="submit" className="h-12 px-4 rounded-xl bg-[#1D252A] text-white">Senden</button>
                  </form>
                  <div className="flex justify-between">
                    <button onClick={() => setStep(2)} className="px-4 py-2 rounded-xl border">Zurück</button>
                    <div className="text-small text-neutrals-500 self-center">{saving === "saving" ? "Speichere…" : "Gespeichert"}</div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

    </main>
  );
}
