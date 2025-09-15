"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveProgress } from "@/lib/progress";
import { createClient } from "@/utils/supabase/client";
import ReactMarkdown from "react-markdown";

type FieldKey = "background" | "current" | "goals";

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

function VoiceRecorderModal({
  open,
  onClose,
  field,
  label,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  field: FieldKey;
  label: string;
  onSaved: (opts: { field: FieldKey; text: string }) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [level, setLevel] = useState(0);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (stopped) return;
          analyser.getByteTimeDomainData(data);
          // simple amplitude estimate
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128; // -1..1
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length); // 0..~1
          setLevel(Math.min(1, rms * 2));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);

        const rec = new MediaRecorder(stream);
        mediaRecorderRef.current = rec;
        chunksRef.current = [];
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.start(200);
        setRecording(true);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      stopped = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        mediaRecorderRef.current?.stop();
      } catch {}
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
      audioStreamRef.current = null;
      analyserRef.current = null;
      setRecording(false);
      setPaused(false);
      setLevel(0);
      setUploading(false);
    };
  }, [open]);

  const onPauseResume = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    if (!paused) {
      rec.pause();
      setPaused(true);
    } else {
      rec.resume();
      setPaused(false);
    }
  };

  const onCancel = () => {
    onClose();
  };

  const onSend = async () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    setUploading(true);
    try {
      rec.stop();
    } catch {}
    // Optimistic close so user can continue with next input
    onSaved({ field, text: "Wird gesendet…" });
    onClose();
    // Allow recorder to flush
    await new Promise((r) => setTimeout(r, 250));
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const fd = new FormData();
    fd.append("file", blob, `${field}-${Date.now()}.webm`);
    fd.append("field", field);
    fd.append("label", label);
    // Send to webhook – server should return a concise summary (markdown allowed)
    try {
      const res = await fetch("https://chrismzke.app.n8n.cloud/webhook-test/4646f17e-7ee3-40b8-b78e-fe9c59d31620", {
        method: "POST",
        body: fd,
      });
      const text = await res.text();
      onSaved({ field, text });
    } catch (e) {
      onSaved({ field, text: "Übertragung fehlgeschlagen." });
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-6">
      <div className="w-full md:max-w-md rounded-t-3xl md:rounded-2xl bg-white p-4 shadow-elevation3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">{label}</h3>
          <button onClick={onCancel} className="text-neutrals-600 text-sm">Schließen</button>
        </div>
        <p className="text-small text-neutrals-600 mb-3">Sprich jetzt. Du kannst pausieren, fortsetzen oder abbrechen.</p>

        <div className="h-3 w-full bg-neutrals-200 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-primary-500 transition-[width]" style={{ width: `${Math.round(level * 100)}%` }} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onPauseResume}
            className="flex-1 h-10 rounded-xl border font-medium"
          >
            {paused ? "Fortsetzen" : "Pause"}
          </button>
          <button onClick={onCancel} className="h-10 px-4 rounded-xl border text-neutrals-700">Abbrechen</button>
          <button
            onClick={onSend}
            disabled={uploading}
            className={cls(
              "h-10 px-4 rounded-xl bg-[#1D252A] text-white font-semibold",
              uploading && "opacity-70 cursor-not-allowed",
            )}
          >
            {uploading ? "Sende…" : "Senden"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FastTrack() {
  // step: 0 = Intro (not part of progress), 1..3 are the steps
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [basics, setBasics] = useState<Basics>({ background: "", current: "", goals: "" });
  const [saving, setSaving] = useState<"idle" | "saving">("idle");
  const [recField, setRecField] = useState<null | FieldKey>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "assistant" | "user"; content: string }[]>([]);

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
              <p className="text-neutrals-700 mb-4">Statt Tippen: per Stimme aufnehmen. Jede Eingabe öffnet ein Pop‑up zur Sprachaufnahme.</p>
              <div className="space-y-4">
                {([
                  { key: "background", label: "Ausbildung und beruflicher Hintergrund" },
                  { key: "current", label: "Aktuelle Rolle" },
                  { key: "goals", label: "Ziele und Interessen" },
                ] as { key: FieldKey; label: string }[]).map((item) => (
                  <div key={item.key} className="rounded-2xl border p-4 bg-neutrals-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-small text-neutrals-600 mt-1 line-clamp-2">
                          {(basics as any)[item.key] ? (basics as any)[item.key] : "Noch keine Eingabe"}
                        </div>
                      </div>
                      <button
                        onClick={() => setRecField(item.key)}
                        className="shrink-0 h-10 px-4 rounded-xl bg-primary-500 text-[#2C2C2C] font-semibold"
                        aria-label={`Aufnehmen: ${item.label}`}
                      >
                        Aufnehmen
                      </button>
                    </div>
                  </div>
                ))}
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
            <section className="rounded-3xl border border-neutrals-200/60 bg-neutrals-0/60 backdrop-blur-md shadow-elevation2 p-0 md:p-6 flex flex-col">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">Schritt 3: Ergebnisse generieren</h2>
                <p className="text-neutrals-600 mt-1">Erzeugt ein Ergebnis basierend auf deinen Eingaben. Ergebnis erscheint darunter im Chat.</p>
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={chatLoading}
                    onClick={async () => {
                      setChatOpen(true);
                      setChatLoading(true);
                      setChatMessages([]);
                      try {
                        const payload = { summary: basics };
                        const res = await fetch(
                          "https://chrismzke.app.n8n.cloud/webhook-test/4646f17e-7ee3-40b8-b78e-fe9c59d31620",
                          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
                        );
                        const text = await res.text();
                        setChatMessages([{ role: "assistant", content: text }]);
                      } catch (e) {
                        setChatMessages([{ role: "assistant", content: "Fehler beim Abrufen der Ergebnisse." }]);
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
                {!chatLoading && chatMessages.length === 0 && (
                  <p className="text-neutrals-600">Klicke auf „Ergebnisse generieren“, um die Ausgabe zu erhalten.</p>
                )}
              </div>

              <div className="sticky bottom-0 bg-white p-3 border-t">
                <form
                  className="flex items-center gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const input = form.elements.namedItem("msg") as HTMLInputElement;
                    const value = input.value.trim();
                    if (!value) return;
                    setChatMessages((msgs) => [...msgs, { role: "user", content: value }]);
                    input.value = "";
                    try {
                      const res = await fetch(
                        "https://chrismzke.app.n8n.cloud/webhook-test/4646f17e-7ee3-40b8-b78e-fe9c59d31620",
                        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summary: basics, followup: value }) },
                      );
                      const text = await res.text();
                      setChatMessages((msgs) => [...msgs, { role: "assistant", content: text }]);
                    } catch (e) {
                      setChatMessages((msgs) => [...msgs, { role: "assistant", content: "Fehler beim Abrufen der Antwort." }]);
                    }
                  }}
                >
                  <input
                    name="msg"
                    placeholder="Nachricht eingeben…"
                    className="flex-1 h-12 px-3 rounded-xl border"
                  />
                  <button type="submit" className="h-12 px-4 rounded-xl bg-[#1D252A] text-white">Senden</button>
                </form>
                <div className="flex justify-between mt-3">
                  <button onClick={() => setStep(2)} className="px-4 py-2 rounded-xl border">Zurück</button>
                  <div className="text-small text-neutrals-500 self-center">{saving === "saving" ? "Speichere…" : "Gespeichert"}</div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      <VoiceRecorderModal
        open={recField !== null}
        field={(recField || "background") as FieldKey}
        label={recField === "current" ? "Aktuelle Rolle" : recField === "goals" ? "Ziele und Interessen" : "Ausbildung und beruflicher Hintergrund"}
        onClose={() => setRecField(null)}
        onSaved={({ field, text }) => {
          setBasics((b) => ({ ...b, [field]: text } as Basics));
        }}
      />
    </main>
  );
}
