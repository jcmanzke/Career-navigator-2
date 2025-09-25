"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { CONTEXT_HEADER_NAME, FAST_TRACK_CONTEXT, N8N_WEBHOOK_URL } from "@/lib/n8n";
import {
  Basics,
  FieldKey,
  HistoryEntry,
  HistoryRecord,
  emptyHistory,
  fieldLabel,
  inputFieldLabel,
  normalizeHistory,
} from "../../shared";

function cls(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const fieldKeys: FieldKey[] = ["background", "current", "goals"];

type RecorderStatus = "idle" | "recording" | "paused";

export default function RecorderPage({ params }: { params: { field: string } }) {
  const router = useRouter();
  const rawField = params.field as FieldKey;
  const field = (fieldKeys.includes(rawField) ? rawField : null) as FieldKey | null;
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [level, setLevel] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [basics, setBasics] = useState<Basics>({ background: "", current: "", goals: "" });
  const [history, setHistory] = useState<HistoryRecord>(emptyHistory);

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
        for (let i = 0; i < data.length; i += 1) {
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
    if (!field) {
      router.replace("/start/fast");
      return;
    }
    (async () => {
      setSessionLoading(true);
      setSessionError(null);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/start");
          return;
        }
        setUserId(user.id);
        const { data: row } = await supabase
          .from("fast_scan_sessions")
          .select("id, basics, history")
          .eq("user_id", user.id)
          .single();
        if (row) {
          setSessionId(row.id ?? null);
          if (row.basics) {
            setBasics({
              background: row.basics.background || "",
              current: row.basics.current || "",
              goals: row.basics.goals || "",
            });
          }
          if (row.history) setHistory(normalizeHistory(row.history));
        } else {
          const { data: created } = await supabase
            .from("fast_scan_sessions")
            .insert({ user_id: user.id, step: 1, basics: {}, history: {}, results: null })
            .select()
            .single();
          if (created) setSessionId(created.id ?? null);
        }
      } catch (err) {
        console.error(err);
        setSessionError("Sitzung konnte nicht geladen werden.");
      } finally {
        setSessionLoading(false);
      }
    })();
  }, [field, router]);

  const toggleRecording = async () => {
    if (uploading || sessionLoading) return;
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
        // handled in initialize
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

  const threadId = useMemo(() => {
    if (!field) return "";
    const base = sessionId ? `fast:${sessionId}` : "fast:anon";
    return `${base}:${field}`;
  }, [sessionId, field]);

  const turn = field ? history[field]?.length ?? 0 : 0;
  const label = field ? fieldLabel(field) : "";
  const snapshot = basics;

  const handleClose = async () => {
    if (uploading) return;
    await stopRecorder();
    cleanup();
    router.push("/start/fast");
  };

  const handleSend = async () => {
    if (!field || uploading || sessionLoading) return;
    if (!chunksRef.current.length && (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive")) {
      setError("Bitte nimm zuerst etwas auf.");
      return;
    }
    setUploading(true);
    try {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.requestData();
        } catch {}
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
      fd.append("identifier", `voice-${field}-${Date.now()}`);
      fd.append("inputField", inputFieldLabel(field));
      if (userId) fd.append("userId", userId);
      if (threadId) fd.append("threadId", threadId);
      fd.append("turn", String(turn));
      fd.append("mode", "append");
      fd.append("mimeType", mimeType);
      if (snapshot && field) {
        const existingSummary = snapshot[field];
        if (existingSummary) {
          fd.append("existingSummary", existingSummary);
        }
      }

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
      const entry: HistoryEntry = { timestamp: Date.now(), text };
      const nextHistory: HistoryRecord = field
        ? {
            ...history,
            [field]: [...(history[field] ?? []), entry].sort((a, b) => a.timestamp - b.timestamp),
          }
        : history;
      const nextBasics: Basics = field ? ({ ...snapshot, [field]: text } as Basics) : snapshot;
      setHistory(nextHistory);
      setBasics(nextBasics);
      if (userId) {
        try {
          const supabase = createClient();
          await supabase
            .from("fast_scan_sessions")
            .upsert({ user_id: userId, basics: nextBasics, history: nextHistory }, { onConflict: "user_id" })
            .select()
            .single();
        } catch (saveErr) {
          console.error(saveErr);
        }
      }
      cleanup();
      router.push("/start/fast");
    } catch (e) {
      console.error(e);
      setError("Übertragung fehlgeschlagen. Bitte versuche es erneut.");
      cleanup();
    } finally {
      setUploading(false);
    }
  };

  const scale = 1 + (status === "recording" ? Math.min(level, 1) * 0.45 : 0.12);
  const primaryText = status === "recording" ? "Pause" : status === "paused" ? "Fortsetzen" : "Aufnehmen";
  const helperText =
    status === "recording"
      ? "Tippe, um die Aufnahme zu pausieren."
      : status === "paused"
      ? "Pausiert – tippe, um fortzusetzen."
      : "Tippe, um die Aufnahme zu starten.";

  if (!field) {
    return null;
  }

  if (sessionLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-neutrals-0 px-6 text-center">
        <span className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" aria-hidden="true" />
        <p className="text-sm text-neutrals-600">Lade deine Sitzung…</p>
      </main>
    );
  }

  if (sessionError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-neutrals-0 px-6 text-center">
        <p className="text-sm font-semibold text-semantic-error-base">{sessionError}</p>
        <button
          type="button"
          onClick={() => router.push("/start/fast")}
          className="mt-4 rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-[#2C2C2C]"
        >
          Zurück
        </button>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-neutrals-0">
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

      <div className="relative flex flex-1 flex-col px-6 pb-10 pt-8 sm:px-8">
        <div className="flex flex-1 flex-col items-center">
          <div className="w-full max-w-md text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-500">
              {status === "recording" ? "Aufnahme läuft" : "Bereit"}
            </p>
            <h1 className="mt-2 text-lg font-semibold text-neutrals-900 sm:text-[22px]">
              Erzähle frei über {label}
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
              className={cls(
                "flex-1 rounded-full bg-primary-500 px-4 py-3 text-center text-small font-semibold text-[#2C2C2C] shadow-elevation2 transition-colors duration-150",
                uploading && "opacity-80 cursor-not-allowed",
              )}
            >
              {uploading ? "Sende…" : "Senden"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
