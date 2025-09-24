"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveProgress } from "@/lib/progress";
import { createClient } from "@/utils/supabase/client";
import ReactMarkdown from "react-markdown";
import { CONTEXT_HEADER_NAME, FAST_TRACK_CONTEXT, N8N_WEBHOOK_URL } from "@/lib/n8n";

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
  userId,
  threadId,
  turn,
  snapshot,
}: {
  open: boolean;
  onClose: () => void;
  field: FieldKey;
  label: string;
  onSaved: (opts: { field: FieldKey; text: string; ok?: boolean }) => void;
  userId?: string | null;
  threadId?: string;
  turn?: number;
  snapshot?: Basics;
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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRafRef = useRef<number | null>(null);
  const dprRef = useRef<number>(1);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256; // smaller for snappier updates
        analyser.smoothingTimeConstant = 0.05; // more responsive
        source.connect(analyser);
        analyserRef.current = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (stopped) return;
          analyser.getByteTimeDomainData(data);
          // Peak amplitude estimate, boosted for sensitivity
          let peak = 0;
          for (let i = 0; i < data.length; i++) {
            const v = Math.abs((data[i] - 128) / 128); // 0..1
            if (v > peak) peak = v;
          }
          const boosted = Math.min(1, peak * 4.5); // increase sensitivity
          // light smoothing to avoid jitter while keeping responsiveness
          setLevel((prev) => prev * 0.4 + boosted * 0.6);
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
      try { audioCtxRef.current?.close(); } catch {}
      audioCtxRef.current = null;
      setRecording(false);
      setPaused(false);
      setLevel(0);
      setUploading(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !recording) return;
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const getDpr = () => (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);

    const resize = () => {
      const dpr = getDpr();
      dprRef.current = dpr;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", resize);
    }

    const data = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      analyser.getByteTimeDomainData(data);
      const dpr = dprRef.current;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.clearRect(0, 0, width, height);

      const sliceWidth = width / Math.max(1, data.length - 1);
      const baseHeight = height * 0.6;
      const amplitudeScale = height * 0.45;

      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128 - 1; // -1..1
        const y = baseHeight - v * amplitudeScale;
        const x = i * sliceWidth;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "rgba(8, 84, 145, 0.55)");
      gradient.addColorStop(0.4, "rgba(24, 120, 205, 0.35)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, baseHeight);
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128 - 1;
        const y = baseHeight - v * amplitudeScale;
        const x = i * sliceWidth;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(12, 63, 120, 0.9)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      drawRafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", resize);
      }
      if (drawRafRef.current) {
        cancelAnimationFrame(drawRafRef.current);
        drawRafRef.current = null;
      }
    };
  }, [open, recording]);

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
    // Required routing info for backend
    const inputField = field === "background" ? "Ausbildung" : field === "current" ? "Aktuelle Rolle" : "Ziele und Interessen";
    fd.append("identifier", `voice-${field}-${Date.now()}`);
    fd.append("inputField", inputField);
    if (userId) fd.append("userId", userId);
    if (threadId) fd.append("threadId", threadId);
    if (typeof turn === 'number') fd.append("turn", String(turn));
    fd.append("mode", "append");
    // Always include the current Step 2 snapshot so the agent sees all answers
    if (snapshot) {
      try { fd.append("step2", JSON.stringify(snapshot)); } catch {}
      if (snapshot.background) fd.append("step2Background", snapshot.background);
      if (snapshot.current) fd.append("step2Current", snapshot.current);
      if (snapshot.goals) fd.append("step2Goals", snapshot.goals);
    }
    // Send to webhook – server should return a concise summary (markdown allowed)
    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { [CONTEXT_HEADER_NAME]: FAST_TRACK_CONTEXT },
        body: fd,
      });
      // Prefer the important value from the `text` header; if JSON, extract .output
      const headerText = res.headers.get("text");
      const bodyText = headerText ?? (await res.text());
      const extractOutput = (txt: string) => {
        try {
          const parsed = JSON.parse(txt);
          if (Array.isArray(parsed)) {
            const outs = parsed.map((o) => (o && typeof o === 'object' ? (o as any).output : null)).filter(Boolean);
            if (outs.length) return outs.join("\n\n");
          }
          if (parsed && typeof parsed === 'object' && (parsed as any).output) return (parsed as any).output as string;
        } catch {}
        return txt;
      };
      const text = extractOutput(bodyText);
      onSaved({ field, text, ok: true });
    } catch (e) {
      onSaved({ field, text: "Übertragung fehlgeschlagen.", ok: false });
    }
  };

  if (!open) return null;
  const outerRingScale = 1 + level * 0.45;
  const innerRingScale = 1 + level * 0.25;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutrals-900/70 px-4 py-6">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[32px] border border-accent-700 bg-neutrals-0 shadow-elevation3">
        <div className="relative h-48 w-full overflow-hidden">
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0D3559]/45 via-primary-500/15 to-transparent" />
        </div>
        <div className="relative z-10 px-6 pb-8 pt-10 md:px-12 md:pb-12 md:pt-16">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary-500">Aufnahme läuft</p>
            <h3 className="mt-2 text-[22px] font-semibold text-neutrals-900 md:text-[28px]">Erzähle frei über {typeof label === "string" ? label : String(label)}</h3>
            <p className="mx-auto mt-3 max-w-2xl text-small text-neutrals-600">
              Wir transkribieren automatisch – sprich so ausführlich wie du möchtest. Du kannst jederzeit pausieren oder senden.
            </p>
          </div>

          <div className="mt-12 flex justify-center">
            <div className="relative flex h-40 w-40 items-center justify-center md:h-48 md:w-48">
              <span
                className="absolute inset-0 rounded-full bg-primary-500/15 transition-transform duration-100 ease-out"
                style={{ transform: `scale(${outerRingScale})` }}
                aria-hidden="true"
              />
              <span
                className="absolute inset-6 rounded-full bg-primary-500/25 transition-transform duration-100 ease-out"
                style={{ transform: `scale(${innerRingScale})` }}
                aria-hidden="true"
              />
              <span className="relative z-10 flex h-full w-full items-center justify-center rounded-full bg-[#1D252A] text-white shadow-lg">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm4-3a4 4 0 11-8 0V6a4 4 0 118 0v5z" fill="currentColor" />
                  <path d="M7 11a1 1 0 10-2 0 7 7 0 006 6.93V20H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0019 11a1 1 0 10-2 0 5 5 0 01-10 0z" fill="currentColor" />
                </svg>
              </span>
            </div>
          </div>

          {uploading && (
            <p className="mt-6 text-center text-small text-neutrals-500">Übertrage Aufnahme…</p>
          )}

          <div className="mt-12 flex flex-col gap-3 md:flex-row md:justify-center">
            <button
              onClick={onPauseResume}
              className="h-12 rounded-full border border-accent-700 px-6 text-small font-semibold text-neutrals-900 transition-colors duration-150 hover:bg-primary-500/10"
            >
              {paused ? "Fortsetzen" : "Pause"}
            </button>
            <button
              onClick={onCancel}
              className="h-12 rounded-full border border-accent-700 px-6 text-small font-semibold text-neutrals-600 transition-colors duration-150 hover:bg-neutrals-100"
            >
              Abbrechen
            </button>
            <button
              onClick={onSend}
              disabled={uploading}
              className={cls(
                "h-12 rounded-full bg-primary-500 px-8 text-small font-semibold text-[#2C2C2C] shadow-elevation2 transition-colors duration-150",
                uploading ? "opacity-70 cursor-not-allowed" : "hover:bg-primary-400",
              )}
            >
              {uploading ? "Sende…" : "Senden"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FastTrack() {
  // step: 1..3 are the active screens; intro screen removed for faster start
  const [step, setStep] = useState<number>(1);
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
  const [sentOk, setSentOk] = useState<Record<FieldKey, boolean>>({ background: false, current: false, goals: false });
  const [threadIds, setThreadIds] = useState<Record<FieldKey, string>>({ background: "", current: "", goals: "" });
  const [turns, setTurns] = useState<Record<FieldKey, number>>({ background: 0, current: 0, goals: 0 });

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
          .select("id, step, basics, results")
          .eq("user_id", user.id)
          .single();
        if (row) {
          setSessionId(row.id);
          const nextStep = typeof row.step === "number" && row.step >= 1 ? row.step : 1;
          setStep(nextStep);
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
            const nextStep = typeof created.step === "number" && created.step >= 1 ? created.step : 1;
            setStep(nextStep);
          }
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Derive stable thread IDs per field from session
  useEffect(() => {
    const base = `fast:${sessionId || 'anon'}`;
    setThreadIds({
      background: `${base}:background`,
      current: `${base}:current`,
      goals: `${base}:goals`,
    });
  }, [sessionId]);

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
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", [CONTEXT_HEADER_NAME]: FAST_TRACK_CONTEXT },
        body: JSON.stringify({ userId, sessionId, basics }),
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
              <div className="space-y-4">
                {(([ 
                  { key: "background", label: "Ausbildung und beruflicher Hintergrund" },
                  { key: "current", label: "Aktuelle Rolle" },
                  { key: "goals", label: "Ziele und Interessen" },
                ] as { key: FieldKey; label: string }[])).map((item) => (
                  <div key={item.key} className="rounded-2xl border p-4 bg-neutrals-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="mt-1 space-y-1">
                          <div className="text-small text-neutrals-600 line-clamp-2">
                            {(basics as any)[item.key] ? (basics as any)[item.key] : "Noch keine Eingabe"}
                          </div>
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
                    {sentOk[item.key] && (
                      <div className="mt-3 w-full rounded-xl bg-green-50 text-green-700 border border-green-200 px-3 py-2 flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" fill="#22C55E"/>
                          <path d="M8 12.5l2.5 2.5L16 9.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Übertragung erfolgreich - sprich einfach weiter, wenn dir noch weitere wichtige Punkte einfallen.</span>
                      </div>
                    )}
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
                          N8N_WEBHOOK_URL,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json", [CONTEXT_HEADER_NAME]: FAST_TRACK_CONTEXT },
                            body: JSON.stringify(payload),
                          },
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
                        N8N_WEBHOOK_URL,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json", [CONTEXT_HEADER_NAME]: FAST_TRACK_CONTEXT },
                          body: JSON.stringify({ summary: basics, followup: value }),
                        },
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
        onSaved={({ field, text, ok }) => {
          setBasics((b) => ({ ...b, [field]: text } as Basics));
          if (ok) {
            setSentOk((s) => ({ ...s, [field]: true }));
            setTurns((t) => ({ ...t, [field]: (t[field] ?? 0) + 1 }));
          }
        }}
        userId={userId}
        threadId={recField ? threadIds[recField] : undefined}
        turn={recField ? turns[recField] : undefined}
        snapshot={basics}
      />
    </main>
  );
}
