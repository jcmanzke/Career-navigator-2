"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { saveProgress } from "@/lib/progress";
import { createClient } from "@/utils/supabase/client";
import ReactMarkdown from "react-markdown";
import { CONTEXT_HEADER_NAME, FAST_TRACK_STEP3_CONTEXT } from "@/lib/n8n";
import { Basics, FieldKey, HistoryRecord, emptyHistory, normalizeHistory, sanitizePlainText } from "./shared";
import { StepOneSection } from "./StepOneSection";

function cls(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const STEP3_CHAT_HEADER_NAME = "X-Fast-Track-Origin";
const STEP3_CHAT_HEADER_VALUE = "fast-track-step-3-chat";

function createConversationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `conv-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function prettifyKey(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\w|\s\w/g, (c) => c.toUpperCase());
}

function valueToMarkdown(value: unknown, depth = 0): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const indent = "  ".repeat(depth);
    return value
      .map((item) => {
        const text = valueToMarkdown(item, depth + 1).trim();
        if (!text) return "";
        const nestedIndent = "  ".repeat(depth + 1);
        const formatted = text.replace(/\n/g, `\n${nestedIndent}`);
        return `${indent}- ${formatted}`;
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => {
        const heading = `**${prettifyKey(key)}**`;
        const body = valueToMarkdown(val, depth + 1).trim();
        return body ? `${heading}\n${body}` : heading;
      })
      .filter(Boolean)
      .join("\n\n");
  }
  return "";
}

function parseAgentPayload(raw: string): { formatted: string; conversationId?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { formatted: "" };
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "string") {
      return { formatted: parsed };
    }
    let conversationId: string | undefined;
    let payloadForDisplay: unknown = parsed;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const {
        conversationId: id,
        content,
        markdown,
        message,
        response,
        text,
        ...rest
      } = parsed as Record<string, unknown>;
      if (typeof id === "string" && id) {
        conversationId = id;
      }
      const primary =
        [content, markdown, message, response, text].find(
          (value) => typeof value === "string" && value.trim().length,
        ) ?? null;
      if (primary) {
        return { formatted: postProcessFormattedText(primary as string), conversationId };
      }
      payloadForDisplay = Object.keys(rest).length ? rest : "";
    }
    const formatted = postProcessFormattedText(valueToMarkdown(payloadForDisplay) || trimmed);
    return { formatted, conversationId };
  } catch {
    return { formatted: postProcessFormattedText(trimmed) };
  }
}

function postProcessFormattedText(text: string): string {
  let processed = text.trimStart();
  processed = processed.replace(/^\*\*Output\*\*(?:\s*\n)*/i, "");
  const lines = processed.split("\n");
  const spaced: string[] = [];
  let inCodeBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTrimmed = line.trim();
    if (/^```/.test(lineTrimmed)) {
      spaced.push(line);
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      spaced.push(line);
      continue;
    }
    if (!lineTrimmed) {
      spaced.push("");
      continue;
    }
    const indentMatch = line.match(/^(\s*)([-*]|\d+\.)\s/);
    spaced.push(line);
    const next = lines[i + 1];
    const nextTrimmed = next?.trim();
    const nextIndentMatch = next?.match(/^(\s*)([-*]|\d+\.)\s/);
    const isHeading = /^#{1,6}\s/.test(lineTrimmed) || /^\*\*[^\*]+\*\*$/.test(lineTrimmed);
    const isNextHeading = nextTrimmed ? /^#{1,6}\s/.test(nextTrimmed) || /^\*\*[^\*]+\*\*$/.test(nextTrimmed) : false;
    const isListLine = Boolean(indentMatch);
    const isNextList = Boolean(nextIndentMatch);
    const hasIndentChange =
      indentMatch &&
      nextIndentMatch &&
      indentMatch[1] !== nextIndentMatch[1];

    if (
      next !== undefined &&
      lineTrimmed &&
      nextTrimmed &&
      !isListLine &&
      !isNextList &&
      !isHeading &&
      !isNextHeading
    ) {
      spaced.push("");
    }

    if (
      next !== undefined &&
      lineTrimmed &&
      nextTrimmed &&
      ((isHeading && !isNextHeading) || (!isHeading && isNextHeading) || hasIndentChange)
    ) {
      spaced.push("");
    }
  }
  processed = spaced.join("\n");
  processed = processed.replace(/([^\s])\n(?=[A-Za-zÀ-ÿ0-9])/g, "$1\n\n");
  return processed.trim();
}

const markdownComponents = {
  p: ({ node, ...props }: any) => (
    <p className="mb-4 last:mb-0 leading-relaxed whitespace-pre-wrap" {...props} />
  ),
  h1: ({ node, ...props }: any) => <h1 className="text-xl font-semibold mt-6 mb-3" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-lg font-semibold mt-5 mb-3" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-base font-semibold mt-4 mb-2" {...props} />,
  ul: ({ node, ordered, ...props }: any) => (
    <ul className="list-disc pl-5 space-y-1 my-3" {...props} />
  ),
  ol: ({ node, ordered, ...props }: any) => (
    <ol className="list-decimal pl-5 space-y-1 my-3" {...props} />
  ),
  li: ({ node, ...props }: any) => <li className="leading-relaxed" {...props} />,
  code: ({ node, inline, className, children, ...props }: any) =>
    inline ? (
      <code className="px-1 py-0.5 rounded bg-neutrals-100 text-primary-700" {...props}>
        {children}
      </code>
    ) : (
      <pre className="bg-neutrals-900 text-neutrals-0 rounded-xl p-3 overflow-x-auto my-4">
        <code {...props}>{children}</code>
      </pre>
    ),
  blockquote: ({ node, ...props }: any) => (
    <blockquote className="border-l-4 border-primary-300 pl-4 italic my-4" {...props} />
  ),
};

function ProgressSteps3({ current, onSelect }: { current: number; onSelect?: (n: number) => void }) {
  const steps = [1, 2, 3];
  const pctTargets = [33, 66, 100];
  const targetPct = pctTargets[current - 1] ?? 0;
  const [displayPct, setDisplayPct] = useState(targetPct);
  const previousPctRef = useRef(targetPct);

  useEffect(() => {
    const initial = previousPctRef.current;
    if (initial === targetPct) {
      setDisplayPct(targetPct);
      return;
    }
    let raf: number;
    const duration = 500;
    const start = performance.now();
    const animate = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - start) / duration);
      const nextValue = initial + (targetPct - initial) * progress;
      setDisplayPct(nextValue);
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        previousPctRef.current = targetPct;
      }
    };
    raf = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [targetPct]);

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
        <div className="h-2 bg-primary-500 rounded-full" style={{ width: `${displayPct}%` }} />
      </div>
      <p className="text-center text-small text-neutrals-500 mt-1">
        Fortschritt: {Math.round(displayPct)}%
      </p>
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
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving">("idle");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "assistant" | "user"; content: string }[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
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
          sessionIdRef.current = row.id ?? sessionIdRef.current;
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
            sessionIdRef.current = created.id ?? sessionIdRef.current;
            const nextStep = typeof created.step === "number" && created.step >= 1 ? created.step : 1;
            setStep(nextStep);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setSessionLoaded(true);
      }
    })();
  }, []);

  const upsertSession = useCallback(
    async (patch: Partial<{ step: number; basics: Basics; history: HistoryRecord; results: any }>) => {
      if (!userId) return;
      const updates: Record<string, unknown> = {};
      if (typeof patch.step === "number") updates.step = patch.step;
      if (patch.basics) updates.basics = patch.basics;
      if (patch.history) updates.history = patch.history;
      if ("results" in patch) updates.results = patch.results;
      if (!Object.keys(updates).length) return;
      try {
        setSaving("saving");
        const supabase = createClient();
        let savedRow: { id?: string } | null = null;

        if (sessionIdRef.current) {
          const { data: updated, error: updateError } = await supabase
            .from("fast_scan_sessions")
            .update(updates)
            .eq("id", sessionIdRef.current)
            .select("id")
            .single();
          if (updateError && updateError.code !== "PGRST116") {
            throw updateError;
          }
          if (!updateError && updated) {
            savedRow = updated;
          }
        }

        if (!savedRow) {
          const insertPayload = {
            user_id: userId,
            step: (updates.step as number) ?? step,
            basics: (updates.basics as Basics) ?? basics,
            history: (updates.history as HistoryRecord) ?? history,
            results: "results" in updates ? updates.results : results,
          };
          const { data: inserted, error: insertError } = await supabase
            .from("fast_scan_sessions")
            .insert(insertPayload)
            .select("id")
            .single();
          if (insertError) throw insertError;
          savedRow = inserted;
        }

        if (savedRow?.id) {
          setSessionId(savedRow.id);
          sessionIdRef.current = savedRow.id;
        }
      } catch (e) {
        console.error(e);
      } finally {
        setSaving("idle");
      }
    },
    [basics, history, results, step, userId],
  );

  // Auto-save basics with debounce while typing
  useEffect(() => {
    if (!userId || step < 1 || !sessionLoaded) return;
    const t = setTimeout(() => {
      upsertSession({ basics, history });
    }, 600);
    return () => clearTimeout(t);
  }, [basics, history, userId, step, sessionLoaded, upsertSession]);

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
      const activeConversationId = conversationId ?? createConversationId();
      setConversationId(activeConversationId);
      const res = await fetch("/api/fast-track-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CONTEXT_HEADER_NAME]: FAST_TRACK_STEP3_CONTEXT,
          [STEP3_CHAT_HEADER_NAME]: STEP3_CHAT_HEADER_VALUE,
        },
        body: JSON.stringify({ userId, sessionId, basics, history, conversationId: activeConversationId }),
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
            <StepOneSection
              basics={basics}
              history={history}
              onRecord={(fieldKey: FieldKey) => router.push(`/start/fast/record/${fieldKey}`)}
              onContinue={async () => {
                await upsertSession({ step: 2, basics, history });
                setStep(2);
              }}
            />
          )}

          {step === 2 && (
            <section className="rounded-3xl border border-neutrals-200/60 bg-neutrals-0/60 backdrop-blur-md shadow-elevation2 p-6">
              <h2 className="text-lg font-semibold mb-2">Schritt 2: Bestätigung</h2>
              <p className="text-neutrals-700 mb-4">Unsere KI hat deine Eingaben zusammengefasst. Ließ am besten einmal drüber und überlege, welche Informationen noch fehlen.</p>
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
            <section className="rounded-3xl border border-neutrals-200/60 bg-neutrals-0/60 backdrop-blur-md shadow-elevation2 p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-neutrals-900">Schritt 3: Ergebnisse generieren</h2>
                <p className="text-neutrals-700 mt-2">
                  Wir fassen deine Antworten zu konkreten Rollen, Skill-Fokus und klaren Suchbegriffen für Jobs zusammen. Du kannst jederzeit nachhaken oder ergänzen.
                </p>
              </div>

              <button
                type="button"
                disabled={chatLoading}
                onClick={async () => {
                  setChatLoading(true);
                  setChatMessages([]);
                  const nextConversationId = conversationId ?? createConversationId();
                  setConversationId(nextConversationId);
                  try {
                    const payload = { summary: basics, history, conversationId: nextConversationId };
                    const res = await fetch("/api/fast-track-webhook", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        [CONTEXT_HEADER_NAME]: FAST_TRACK_STEP3_CONTEXT,
                        [STEP3_CHAT_HEADER_NAME]: STEP3_CHAT_HEADER_VALUE,
                      },
                      body: JSON.stringify(payload),
                    });
                    const text = await res.text();
                    const { formatted, conversationId: returnedId } = parseAgentPayload(text);
                    setChatMessages([{ role: "assistant", content: formatted }]);
                    if (returnedId) setConversationId(returnedId);
                  } catch (e) {
                    const fallback = "Fehler beim Abrufen der Ergebnisse.";
                    const { formatted } = parseAgentPayload(fallback);
                    setChatMessages([{ role: "assistant", content: formatted }]);
                  } finally {
                    setChatLoading(false);
                  }
                }}
                className={cls(
                  "mt-4 mb-2 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 font-semibold text-[#2C2C2C]",
                  "bg-primary-500 transition hover:bg-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500",
                  chatLoading && "opacity-70 cursor-not-allowed",
                )}
              >
                {chatLoading ? "Verarbeite…" : "Ergebnisse generieren"}
              </button>

              <div className="rounded-2xl border border-neutrals-200 bg-white/95 flex flex-col">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutrals-500">Live-Ausgabe</p>
                    <p className="text-base font-semibold text-neutrals-900">Fast-Track Chat</p>
                  </div>
                </div>
                <div className="flex-1 min-h-[300px] px-4 py-4 space-y-3">
                  {chatLoading && chatMessages.length === 0 && (
                    <div className="space-y-6 rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-white to-primary-100 p-6 text-center shadow-inner">
                      <div className="mx-auto flex h-28 w-28 items-center justify-center">
                        <div className="relative h-24 w-24">
                          <span className="cn-pulse-ring absolute inset-0 rounded-full bg-primary-200/40" aria-hidden="true" />
                          <span className="cn-orbit absolute inset-2 rounded-full border border-primary-200" aria-hidden="true" />
                          <span className="cn-orbit-slow absolute inset-4 rounded-full border border-primary-100" aria-hidden="true" />
                          <div className="relative flex h-full w-full items-center justify-center rounded-full bg-white shadow-elevation2">
                            <img
                              src="/apple-touch-icon.png"
                              alt="Career Navigator Logo"
                              className="h-12 w-12 object-contain cn-icon-glow"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-neutrals-900">Wir verdichten deine Antworten …</p>
                        <p className="text-sm text-neutrals-600">Dauert nur wenige Sekunden.</p>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex w-full max-w-xs justify-center gap-2">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className="cn-loading-bar h-2 flex-1 rounded-full bg-primary-400/60"
                              style={{ animationDelay: `${i * 0.15}s` } as CSSProperties}
                            />
                          ))}
                        </div>
                        <p className="text-xs uppercase tracking-wide text-primary-600">Analyse läuft</p>
                      </div>
                    </div>
                  )}
                  {chatLoading && chatMessages.length > 0 && (
                    <div className="flex items-center gap-3 text-neutrals-600 text-sm">
                      <span className="h-4 w-4 border-2 border-neutrals-400 border-t-transparent rounded-full animate-spin" />
                      <span>Verarbeite…</span>
                    </div>
                  )}
                  {!chatLoading && chatMessages.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-neutrals-200 bg-neutrals-50 p-4 text-sm text-neutrals-600">
                      Starte die Generierung oder stelle eine Frage, um hier Ergebnisse zu sehen.
                    </div>
                  )}
                  {chatMessages.map((m, i) => (
                    <div
                      key={`${m.role}-${i}`}
                      className={cls(
                        "rounded-2xl p-4 text-sm shadow-sm",
                        m.role === "assistant"
                          ? "bg-neutrals-50 border border-neutrals-200"
                          : "bg-primary-50 border border-primary-200",
                      )}
                    >
                      <ReactMarkdown className="prose prose-sm max-w-none" components={markdownComponents}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  ))}
                </div>
                <form
                  className="border-t px-3 py-3 flex flex-col gap-3 sm:flex-row sm:items-center"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const input = form.elements.namedItem("msg") as HTMLInputElement;
                    const value = input.value.trim();
                    if (!value) return;
                    const activeConversationId = conversationId ?? createConversationId();
                    setConversationId(activeConversationId);
                    setChatMessages((msgs) => [...msgs, { role: "user", content: value }]);
                    input.value = "";
                    try {
                      const payload = { summary: basics, followup: value, history, conversationId: activeConversationId };
                      const res = await fetch("/api/fast-track-webhook", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          [CONTEXT_HEADER_NAME]: FAST_TRACK_STEP3_CONTEXT,
                          [STEP3_CHAT_HEADER_NAME]: STEP3_CHAT_HEADER_VALUE,
                        },
                        body: JSON.stringify(payload),
                      });
                      const text = await res.text();
                      const { formatted, conversationId: returnedId } = parseAgentPayload(text);
                      setChatMessages((msgs) => [...msgs, { role: "assistant", content: formatted }]);
                      if (returnedId) setConversationId(returnedId);
                    } catch (e) {
                      const errorResponse = "Fehler beim Abrufen der Antwort.";
                      const { formatted } = parseAgentPayload(errorResponse);
                      setChatMessages((msgs) => [...msgs, { role: "assistant", content: formatted }]);
                    }
                  }}
                >
                  <input
                    name="msg"
                    placeholder="Nachricht eingeben…"
                    className="flex-1 min-w-0 h-12 rounded-xl border border-neutrals-300 px-3 text-sm focus:border-primary-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="h-12 rounded-xl bg-[#1D252A] px-5 text-sm font-semibold text-white transition hover:bg-primary-500 hover:text-neutrals-900"
                  >
                    Senden
                  </button>
                </form>
              </div>

              <div className="mt-10 pt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button onClick={() => setStep(2)} className="rounded-xl border px-4 py-2 text-sm text-neutrals-700">
                  Zurück zu Schritt 2
                </button>
                <div className="text-xs text-neutrals-500">
                  {saving === "saving" ? "Speichere aktuellen Stand …" : "Alle Änderungen gespeichert."}
                </div>
              </div>
            </section>
          )}
        </div>
      )}

    </main>
  );
}
