"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { saveProgress } from "@/lib/progress";
import { createClient } from "@/utils/supabase/client";
import ReactMarkdown from "react-markdown";
import { CONTEXT_HEADER_NAME, FAST_TRACK_CONTEXT, N8N_WEBHOOK_URL } from "@/lib/n8n";

type FieldKey = "background" | "current" | "goals";
type RecorderStatus = "idle" | "recording" | "paused";
type HistoryEntry = { timestamp: number; text: string };
type HistoryRecord = Record<FieldKey, HistoryEntry[]>;

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

const emptyHistory: HistoryRecord = {
  background: [],
  current: [],
  goals: [],
};

function VoiceRecorderScreen({
  open,
  onClose,
  field,
  label,
  onSaved,
  userId,
  threadId,
  turn,
  snapshot,
  history,
}: {
  open: boolean;
  onClose: () => void;
  field: FieldKey;
  label: string;
  onSaved: (opts: { field: FieldKey; text: string; ok?: boolean; timestamp?: number }) => void;
  userId?: string | null;
  threadId?: string;
  turn?: number;
  snapshot?: Basics;
  history: HistoryRecord;
}) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [level, setLevel] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const portalRef = useRef<HTMLElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const statusRef = useRef<RecorderStatus>("idle");

  const updateStatus = useCallback((next: RecorderStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const stopMeter = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startMeter = useCallback(() => {
    if (!analyserRef.current) return;
    stopMeter();
    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (statusRef.current === "recording") {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) {
          const v = Math.abs((data[i] - 128) / 128);
          if (v > peak) peak = v;
        }
        const boosted = Math.min(1, peak * 3.5);
        setLevel((prev) => prev * 0.75 + boosted * 0.25);
      } else {
        setLevel((prev) => prev * 0.92);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [stopMeter]);

  const cleanup = useCallback(() => {
    stopMeter();
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    chunksRef.current = [];
    updateStatus("idle");
    setLevel(0);
    setError(null);
  }, [stopMeter, updateStatus]);

  const initialize = useCallback(async () => {
    if (mediaRecorderRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.05;
      source.connect(analyser);
      analyserRef.current = analyser;
      startMeter();

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.error(e);
      setError("Zugriff auf das Mikrofon nicht möglich.");
      cleanup();
      throw e;
    }
  }, [cleanup, startMeter]);

  const stopRecorder = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === "inactive") {
      updateStatus("idle");
      return;
    }
    const stopped = new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
    });
    try {
      recorder.stop();
    } catch {}
    await Promise.race([stopped, new Promise((resolve) => setTimeout(resolve, 500))]);
    updateStatus("idle");
  }, [updateStatus]);

  useEffect(() => {
    return () => {
      stopRecorder().catch(() => {});
      cleanup();
    };
  }, [cleanup, stopRecorder]);

  useEffect(() => {
    if (!open) return;
    if (typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    try { window.scrollTo(0, 0); } catch {}
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    if (!portalRef.current) {
      const el = document.createElement("div");
      el.className = "cn-recorder-portal";
      document.body.appendChild(el);
      portalRef.current = el;
    }
    const node = portalRef.current;
    return () => {
      if (node && node.parentNode) {
        try { node.parentNode.removeChild(node); } catch {}
      }
      portalRef.current = null;
    };
  }, [open]);

  const toggleRecording = async () => {
    if (uploading) return;
    setError(null);
    const recorder = mediaRecorderRef.current;
    if (status === "idle") {
      try {
        await initialize();
        chunksRef.current = [];
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
          try {
            mediaRecorderRef.current.start(300);
          } catch (e) {
            console.error(e);
          }
        }
        updateStatus("recording");
      } catch {
        // error already handled in initialize
      }
    } else if (status === "recording") {
      if (recorder && recorder.state === "recording") {
        try {
          recorder.pause();
        } catch (e) {
          console.error(e);
        }
        updateStatus("paused");
      }
    } else {
      if (recorder && recorder.state === "paused") {
        try {
          recorder.resume();
        } catch (e) {
          console.error(e);
        }
        updateStatus("recording");
      }
    }
  };

  const handleClose = async () => {
    if (uploading) return;
    await stopRecorder();
    cleanup();
    onClose();
  };

  const handleSend = async () => {
    if (uploading) return;
    if (!chunksRef.current.length && (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive")) {
      setError("Bitte nimm zuerst etwas auf.");
      return;
    }
    setUploading(true);
    try {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try { recorder.requestData(); } catch {}
      }
      await stopRecorder();
      for (let i = 0; i < 10 && chunksRef.current.length === 0; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      const mimeType = mediaRecorderRef.current?.mimeType || chunksRef.current[0]?.type || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (!blob.size) {
        setError("Die Aufnahme war leer. Bitte versuche es erneut.");
        setUploading(false);
        return;
      }
      const fd = new FormData();
      const fileName = `${field}-${Date.now()}.${mimeType.includes("mp4") ? "m4a" : "webm"}`;
      fd.append("file", blob, fileName);
      fd.append("field", field);
      fd.append("label", label);
      const inputField = field === "background" ? "Ausbildung" : field === "current" ? "Aktuelle Rolle" : "Ziele und Interessen";
      fd.append("identifier", `voice-${field}-${Date.now()}`);
      fd.append("inputField", inputField);
      if (userId) fd.append("userId", userId);
      if (threadId) fd.append("threadId", threadId);
      if (typeof turn === "number") fd.append("turn", String(turn));
      fd.append("mode", "append");
      fd.append("mimeType", mimeType);
      if (snapshot) {
        try {
          fd.append("step2", JSON.stringify(snapshot));
        } catch {}
        if (snapshot.background) fd.append("step2Background", snapshot.background);
        if (snapshot.current) fd.append("step2Current", snapshot.current);
        if (snapshot.goals) fd.append("step2Goals", snapshot.goals);
      }
      try {
        fd.append("history", JSON.stringify(history));
      } catch {}

      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        mode: "cors",
        headers: { [CONTEXT_HEADER_NAME]: FAST_TRACK_CONTEXT },
        body: fd,
      });
      const headerText = res.headers.get("text");
      const bodyText = headerText ?? (await res.text());
      const extractOutput = (txt: string) => {
        try {
          const parsed = JSON.parse(txt);
          if (Array.isArray(parsed)) {
            const outs = parsed
              .map((o) => (o && typeof o === "object" ? (o as any).output : null))
              .filter(Boolean);
            if (outs.length) return outs.join("\n\n");
          }
          if (parsed && typeof parsed === "object" && (parsed as any).output) return (parsed as any).output as string;
        } catch {}
        return txt;
      };
      const text = extractOutput(bodyText);
      onSaved({ field, text, ok: true, timestamp: Date.now() });
      cleanup();
      onClose();
    } catch (e) {
      console.error(e);
      onSaved({ field, text: "Übertragung fehlgeschlagen.", ok: false });
      cleanup();
      onClose();
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  const scale = 1 + (status === "recording" ? Math.min(level, 1) * 0.45 : 0.12);
  const primaryText = status === "recording" ? "Pause" : status === "paused" ? "Fortsetzen" : "Aufnehmen";
  const helperText = status === "recording"
    ? "Tippe, um die Aufnahme zu pausieren."
    : status === "paused"
    ? "Pausiert – tippe, um fortzusetzen."
    : "Tippe, um die Aufnahme zu starten.";

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutrals-0 relative">
      {uploading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-neutrals-900/65 backdrop-blur-sm">
          <div className="relative flex flex-col items-center gap-6 text-center text-neutrals-0">
            <div className="relative h-48 w-48">
              <span className="cn-pulse-ring absolute inset-0 rounded-full" />
              <span className="cn-pulse-ring-delay absolute inset-6 rounded-full" />
              <div className="cn-orbit absolute inset-12 rounded-full">
                <div className="absolute inset-[10px] rounded-full bg-[#0B1E2C] opacity-80" />
              </div>
              <div className="absolute inset-[36px] flex items-center justify-center rounded-full bg-[#1D252A] text-white shadow-elevation3">
                <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm4-3a4 4 0 11-8 0V6a4 4 0 118 0v5z" />
                  <path d="M7 11a1 1 0 10-2 0 7 7 0 006 6.93V20H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0019 11a1 1 0 10-2 0 5 5 0 01-10 0z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold">Übertragung läuft…</p>
              <p className="max-w-xs text-sm text-neutrals-200">
                Wir sichern deine Aufnahme und bereiten sie für die Analyse vor.
              </p>
            </div>
          </div>
        </div>
      )}

      <header className="flex h-14 items-center gap-3 border-b border-accent-200 px-4">
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutrals-900 hover:bg-primary-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
          aria-label="Zurück"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M14 7l-5 5 5 5V7z" />
          </svg>
        </button>
        <div className="flex-1 text-center text-sm font-semibold text-neutrals-900">Sprachaufnahme</div>
        <div className="w-9" aria-hidden="true" />
      </header>

      <main className="relative flex flex-1 flex-col px-6 pb-10 pt-8 sm:px-8">
        <div className="flex flex-1 flex-col items-center">
          <div className="w-full max-w-md text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-500">{status === "recording" ? "Aufnahme läuft" : "Bereit"}</p>
            <h1 className="mt-2 text-lg font-semibold text-neutrals-900 sm:text-[22px]">
              Erzähle frei über {typeof label === "string" ? label : String(label)}
            </h1>
            <p className="mt-3 text-small text-neutrals-600">
              Wir transkribieren automatisch – du kannst jederzeit pausieren oder die Aufnahme senden.
            </p>
          </div>

          <div className="mt-10 flex flex-1 flex-col items-center justify-center">
            <button
              type="button"
              onClick={toggleRecording}
              disabled={uploading}
              className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[#1D252A] text-white shadow-elevation3 transition-transform duration-500 ease-out sm:h-32 sm:w-32"
              style={{ transform: `scale(${scale})` }}
              aria-label={primaryText}
            >
              <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3zm4-3a4 4 0 11-8 0V6a4 4 0 118 0v5z" />
                <path d="M7 11a1 1 0 10-2 0 7 7 0 006 6.93V20H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0019 11a1 1 0 10-2 0 5 5 0 01-10 0z" />
              </svg>
            </button>
            <span className="mt-6 text-sm font-semibold text-neutrals-900">{primaryText}</span>
            <p className="mt-2 text-xs text-neutrals-500">{helperText}</p>
            {error && <p className="mt-3 text-xs font-medium text-semantic-error-base">{error}</p>}
          </div>
        </div>

        <div className="mt-10 w-full max-w-md self-center">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="flex-1 rounded-full border border-accent-700 px-4 py-3 text-center text-small font-semibold text-neutrals-600 transition-colors duration-150 hover:bg-neutrals-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={uploading}
              className="flex-1 rounded-full bg-primary-500 px-4 py-3 text-center text-small font-semibold text-[#2C2C2C] shadow-elevation2 transition-colors duration-150 hover:bg-primary-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {uploading ? "Sende…" : "Senden"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );

  if (typeof document === "undefined") return content;
  const target = portalRef.current ?? document.body;
  return createPortal(content, target);
}

export default function FastTrack() {
  // step: 1..3 are the active screens; intro screen removed for faster start
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [basics, setBasics] = useState<Basics>({ background: "", current: "", goals: "" });
  const [history, setHistory] = useState<HistoryRecord>(emptyHistory);
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
          .select("id, step, basics, history, results")
          .eq("user_id", user.id)
          .single();
        if (row) {
          setSessionId(row.id);
          const nextStep = typeof row.step === "number" && row.step >= 1 ? row.step : 1;
          setStep(nextStep);
          if (row.basics) setBasics({ background: row.basics.background || "", current: row.basics.current || "", goals: row.basics.goals || "" });
          if (row.history) {
            const normalize = (value: any): HistoryRecord => {
              const base: HistoryRecord = { ...emptyHistory };
              (Object.keys(base) as FieldKey[]).forEach((key) => {
                const arr = Array.isArray(value?.[key]) ? value[key] : [];
                base[key] = arr
                  .filter((entry: any) => entry && typeof entry.text === "string")
                  .map((entry: any) => ({
                    timestamp: typeof entry.timestamp === "number" ? entry.timestamp : Date.now(),
                    text: String(entry.text),
                  }))
                  .sort((a, b) => a.timestamp - b.timestamp);
              });
              return base;
            };
            setHistory(normalize(row.history));
          }
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
                        type="button"
                        onClick={() => setRecField(item.key)}
                        onTouchStart={() => setRecField(item.key)}
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
                        <span>Übertragung erfolgreich</span>
                      </div>
                    )}
                  </div>
                ))}
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

      <VoiceRecorderScreen
        open={recField !== null}
        field={(recField || "background") as FieldKey}
        label={recField === "current" ? "Aktuelle Rolle" : recField === "goals" ? "Ziele und Interessen" : "Ausbildung und beruflicher Hintergrund"}
        onClose={() => setRecField(null)}
        onSaved={({ field, text, ok, timestamp }) => {
          if (!ok) {
            setSentOk((s) => ({ ...s, [field]: false }));
            return;
          }
          const entry: HistoryEntry = {
            timestamp: timestamp ?? Date.now(),
            text,
          };
          setHistory((prev) => {
            const nextHistory: HistoryRecord = {
              ...prev,
              [field]: [...(prev[field] ?? []), entry].sort((a, b) => a.timestamp - b.timestamp),
            };
            setBasics((b) => {
              const nextBasics = { ...b, [field]: text } as Basics;
              upsertSession({ basics: nextBasics, history: nextHistory });
              return nextBasics;
            });
            return nextHistory;
          });
          setSentOk((s) => ({ ...s, [field]: true }));
          setTurns((t) => ({ ...t, [field]: (t[field] ?? 0) + 1 }));
        }}
        userId={userId}
        threadId={recField ? threadIds[recField] : undefined}
        turn={recField ? turns[recField] : undefined}
        snapshot={basics}
        history={history}
      />
    </main>
  );
}
