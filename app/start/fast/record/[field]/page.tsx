"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { saveProgress } from "@/lib/progress";
import {
  type Basics,
  type FieldKey,
  type HistoryEntry,
  type HistoryRecord,
  emptyHistory,
  fieldLabel,
  normalizeHistory,
  sanitizePlainText,
} from "../../shared";
import { CONTEXT_HEADER_NAME, FAST_TRACK_STEP1_CONTEXT } from "@/lib/n8n";

const FIELD_KEYS: FieldKey[] = ["background", "current", "goals"];
const HISTORY_LIMIT = 10;

const RESPONSE_KEYS = [
  "summary",
  "result",
  "value",
  "transcript",
  "text",
  "message",
  "response",
  "output",
  "content",
  "data",
  "answer",
];

function cls(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function extractFromNode(node: unknown, keys: string[]): string {
  const visit = (value: unknown, allowReturn: boolean): string => {
    if (typeof value === "string" || typeof value === "number") {
      if (!allowReturn) return "";
      const text = String(value).trim();
      return text.length ? text : "";
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = visit(item, allowReturn);
        if (found) return found;
      }
      return "";
    }
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      for (const key of keys) {
        if (key in obj) {
          const found = visit(obj[key], true);
          if (found) return found;
        }
      }
      for (const child of Object.values(obj)) {
        const found = visit(child, allowReturn);
        if (found) return found;
      }
    }
    return "";
  };

  return visit(node, false);
}

function extractPlainTextResponse(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const tryNode = (node: unknown, depth = 0): string => {
    if (!node || depth > 8) return "";
    if (typeof node === "string") {
      const value = node.trim();
      return value.length ? value : "";
    }
    if (typeof node === "number") return String(node);
    if (Array.isArray(node)) {
      return node
        .map((item) => tryNode(item, depth + 1))
        .filter((part) => part.length > 0)
        .join(" ")
        .trim();
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      for (const key of RESPONSE_KEYS) {
        if (key in obj) {
          const found = tryNode(obj[key], depth + 1);
          if (found) return found;
        }
      }
      for (const value of Object.values(obj)) {
        const found = tryNode(value, depth + 1);
        if (found) return found;
      }
    }
    return "";
  };

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      const extracted = tryNode(parsed);
      if (extracted) return extracted;
    } catch {
      // fall back to raw text
    }
  }
  return trimmed;
}

function RecordingOverlay({
  fieldName,
  recording,
  paused,
  disabled,
  statusMessage,
  errorMessage,
  onPrimary,
  onPauseResume,
  onSend,
  onBack,
}: {
  fieldName: string;
  recording: boolean;
  paused: boolean;
  disabled?: boolean;
  statusMessage?: string | null;
  errorMessage?: string | null;
  onPrimary: () => void | Promise<void>;
  onPauseResume: () => void | Promise<void>;
  onSend: () => void | Promise<void>;
  onBack: () => void | Promise<void>;
}) {
  const statusText = recording ? (paused ? "Aufnahme pausiert" : "Aufnahme läuft") : "Bereit für deine Stimme";
  const primaryLabel = !recording ? "Aufnahme starten" : paused ? "Aufnahme fortsetzen" : "Aufnahme beenden";
  const pauseLabel = paused ? "Continue" : "Pause";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm px-6 text-white">
      <div className="w-full max-w-md space-y-8 text-center">
        <p className="text-small uppercase tracking-[0.3em] text-white/80">{statusText}</p>
        <h2 className="text-2xl font-semibold text-white">Sprich über: {fieldName}</h2>
        <button
          type="button"
          onClick={() => {
            void onPrimary();
          }}
          disabled={disabled}
          className={cls(
            "group relative mx-auto flex h-52 w-52 items-center justify-center rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60",
            disabled && "opacity-60",
          )}
          aria-label={primaryLabel}
        >
          <span className="absolute inset-0 rounded-full border border-white/30 transition-opacity" aria-hidden="true" />
          <span
            className={cls(
              "absolute inset-0 rounded-full cn-pulse-ring",
              recording && !paused ? "opacity-100" : "opacity-0",
            )}
            aria-hidden="true"
          />
          <span
            className={cls(
              "absolute inset-6 rounded-full cn-pulse-ring-delay",
              recording && !paused ? "opacity-100" : "opacity-0",
            )}
            aria-hidden="true"
          />
          <span
            className={cls(
              "relative flex h-32 w-32 items-center justify-center rounded-full bg-primary-500 text-white shadow-elevation4 transition-transform",
              recording && !paused ? "scale-110" : "scale-100",
            )}
          >
            <span className="text-4xl">{!recording ? "🎙️" : paused ? "▶" : "■"}</span>
          </span>
        </button>
        <p className="text-white/90">
          {!recording
            ? "Tippe auf den Kreis, um die Aufnahme zu starten und beginne zu sprechen."
            : paused
            ? "Tippe auf den Kreis oder wähle Continue, um weiterzusprechen."
            : "Tippe auf den Kreis oder wähle Send, um die Aufnahme zu beenden."}
        </p>
        {errorMessage ? (
          <p className="text-sm text-semantic-error-light">{errorMessage}</p>
        ) : statusMessage ? (
          <p className="text-sm text-white/80">{statusMessage}</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              void onPauseResume();
            }}
            className="inline-flex items-center justify-center rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!recording}
          >
            {pauseLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              void onSend();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-elevation3 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!recording}
          >
            Send
          </button>
          <button
            type="button"
            onClick={() => {
              void onBack();
            }}
            className="inline-flex items-center justify-center rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

function SendingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm px-6 text-neutrals-0">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
          <div className="absolute h-full w-full rounded-full border border-white/20" />
          <div className="cn-orbit h-36 w-36 rounded-full" aria-hidden="true" />
          <div className="absolute inset-10 flex items-center justify-center rounded-full bg-primary-500 text-[#2C2C2C] font-semibold">
            <span>Sendet…</span>
          </div>
        </div>
        <p className="text-lg font-medium">{message}</p>
        <p className="text-sm text-white/70">Bitte kurz warten, wir schreiben dein Gesagtes für dich auf.</p>
      </div>
    </div>
  );
}

export default function RecordFieldPage() {
  const router = useRouter();
  const params = useParams<{ field: string }>();
  const rawField = params?.field ?? "";
  const field = useMemo<FieldKey | null>(
    () => (FIELD_KEYS.includes(rawField as FieldKey) ? (rawField as FieldKey) : null),
    [rawField],
  );

  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [basics, setBasics] = useState<Basics>({ background: "", current: "", goals: "" });
  const [history, setHistory] = useState<HistoryRecord>(emptyHistory);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [recorderOpen, setRecorderOpen] = useState(true);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldUploadRef = useRef(false);
  const mimeTypeRef = useRef<string>("audio/webm");
  const valueRef = useRef("");
  const recordingStartRef = useRef<number | null>(null);
  const basicsRef = useRef<Basics>(basics);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    valueRef.current = sanitizePlainText(
      field ? basics[field] ?? "" : "",
    );
  }, [basics, field]);

  useEffect(() => {
    basicsRef.current = basics;
  }, [basics]);

  const exitToStepOne = useCallback(
    (delay = 0) => {
      setRecorderOpen(false);
      const navigate = () => {
        router.push("/start/fast");
        router.refresh();
      };
      if (delay > 0) {
        setTimeout(navigate, delay);
      } else {
        navigate();
      }
    },
    [router],
  );

  useEffect(() => {
    if (!field) {
      router.replace("/start/fast");
      return;
    }
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setStatus(null);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Bitte melde dich an, um Aufnahmen zu speichern.");
          return;
        }
        if (!active) return;
        setUserId(user.id);

        let basicsData: Basics = { background: "", current: "", goals: "" };
        let historyData: HistoryRecord = emptyHistory;

        const { data: row, error: selectError } = await supabase
          .from("fast_scan_sessions")
          .select("id, basics, history")
          .eq("user_id", user.id)
          .single();

        if (selectError && selectError.code !== "PGRST116") {
          throw selectError;
        }

        if (row) {
          sessionIdRef.current = row.id ?? sessionIdRef.current;
          basicsData = {
            background: sanitizePlainText(row.basics?.background ?? ""),
            current: sanitizePlainText(row.basics?.current ?? ""),
            goals: sanitizePlainText(row.basics?.goals ?? ""),
          };
          historyData = normalizeHistory(row.history);
        } else {
          const { data: created, error: insertError } = await supabase
            .from("fast_scan_sessions")
            .insert({ user_id: user.id, step: 1, basics: {}, history: {} })
            .select("id, basics, history")
            .single();
          if (insertError) throw insertError;
          sessionIdRef.current = created?.id ?? sessionIdRef.current;
          basicsData = {
            background: sanitizePlainText(created?.basics?.background ?? ""),
            current: sanitizePlainText(created?.basics?.current ?? ""),
            goals: sanitizePlainText(created?.basics?.goals ?? ""),
          };
          historyData = normalizeHistory(created?.history);
        }

        if (!active) return;
        setBasics(basicsData);
        setHistory(historyData);
        valueRef.current = sanitizePlainText(basicsData[field] ?? "");
      } catch (err) {
        console.error("fast/record load error", err);
        if (active) setError("Daten konnten nicht geladen werden.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [field, router]);

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      try {
        mediaRef.current?.stop();
      } catch {}
      mediaRef.current = null;
      try {
        streamRef.current?.getTracks().forEach((track) => track.stop());
      } catch {}
      streamRef.current = null;
    };
  }, []);

  const saveFieldValue = useCallback(
    async (rawText: string, options: { addHistory?: boolean; durationMs?: number } = {}) => {
      const { addHistory = true, durationMs } = options;
      if (!field || !userId) return false;
      const trimmed = sanitizePlainText(rawText).trim();
      if (!trimmed) return false;

      try {
        const supabase = createClient();
        const nextBasics: Basics = { ...basicsRef.current, [field]: trimmed } as Basics;
        const existing: HistoryEntry[] = history[field] ?? [];
        const lastEntry = existing[existing.length - 1]?.text ?? "";
        const shouldAppend = addHistory && sanitizePlainText(lastEntry) !== trimmed;
        const nextEntries = shouldAppend
          ? [...existing, { timestamp: Date.now(), text: trimmed, durationMs }]
          : existing;
        const limitedEntries = shouldAppend ? nextEntries.slice(-HISTORY_LIMIT) : existing;
        const nextHistory: HistoryRecord = shouldAppend
          ? { ...history, [field]: limitedEntries }
          : { ...history };

        const payload = {
          basics: nextBasics,
          history: nextHistory,
          step: 1,
        };

        let savedRow: { id?: string; basics?: unknown; history?: unknown } | null = null;

        if (sessionIdRef.current) {
          const { data: updated, error: updateError } = await supabase
            .from("fast_scan_sessions")
            .update(payload)
            .eq("id", sessionIdRef.current)
            .select("id, basics, history")
            .single();

          if (updateError && updateError.code !== "PGRST116") {
            throw updateError;
          }
          if (!updateError && updated) {
            savedRow = updated;
          }
        }

        if (!savedRow) {
          const { data: inserted, error: insertError } = await supabase
            .from("fast_scan_sessions")
            .insert({ user_id: userId, ...payload })
            .select("id, basics, history")
            .single();
          if (insertError) throw insertError;
          savedRow = inserted;
        }

        if (savedRow?.id) {
          sessionIdRef.current = savedRow.id;
        }

        const mergedBasics: Basics = savedRow?.basics
          ? {
              background: sanitizePlainText((savedRow.basics as any)?.background ?? nextBasics.background ?? ""),
              current: sanitizePlainText((savedRow.basics as any)?.current ?? nextBasics.current ?? ""),
              goals: sanitizePlainText((savedRow.basics as any)?.goals ?? nextBasics.goals ?? ""),
            }
          : nextBasics;

        const mergedHistory = savedRow?.history ? normalizeHistory(savedRow.history) : normalizeHistory(nextHistory);

        basicsRef.current = mergedBasics;
        setBasics(mergedBasics);
        setHistory(mergedHistory);
        valueRef.current = trimmed;
        return true;
      } catch (err) {
        console.error("fast/record save error", err);
        return false;
      }
    },
    [field, history, userId],
  );

  const uploadRecording = useCallback(
    async (blob: Blob, durationMs?: number) => {
      if (!userId || !field) return;
      try {
        setTranscribing(true);
        setStatus("Übertrage deine Aufnahme…");
        setError(null);
        const fd = new FormData();
        const ext = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "mp4" : "webm";
        fd.append("file", blob, `audio-${field}-${Date.now()}.${ext}`);
        fd.append("field", field);
        const latestSummary = sanitizePlainText(basicsRef.current[field] ?? "");
        if (latestSummary) fd.append("latestSummary", latestSummary);
        const response = await fetch("/api/fast-track-webhook", {
          method: "POST",
          headers: {
            [CONTEXT_HEADER_NAME]: FAST_TRACK_STEP1_CONTEXT,
            "X-FastTrack-Mode": "guidance",
          },
          body: fd,
        });
        const payloadText = await response.text();
        if (!response.ok) {
          throw new Error(payloadText || "Upload fehlgeschlagen");
        }
        const trimmedPayload = payloadText.trim();
        let parsedSummary = "";
        let parsedTranscript = "";
        if (trimmedPayload.startsWith("{") || trimmedPayload.startsWith("[")) {
          try {
            const parsed = JSON.parse(trimmedPayload);
            parsedSummary = extractFromNode(parsed, ["summary", "result", "value"]);
            parsedTranscript = extractFromNode(parsed, ["transcript", "user", "input", "answer"]);
          } catch {
            // fall back to plain text parsing below
          }
        }

        const fallbackPlain = sanitizePlainText(extractPlainTextResponse(payloadText));
        const previousText = valueRef.current;
        const summaryText = sanitizePlainText(
          parsedSummary || parsedTranscript || fallbackPlain || previousText,
        );
        const transcriptText = sanitizePlainText(parsedTranscript || fallbackPlain || previousText);

        if (summaryText) {
          const saved = await saveFieldValue(summaryText, { addHistory: true, durationMs });
          if (!saved) {
            setError("Speichern fehlgeschlagen. Bitte versuche es erneut.");
            setStatus(null);
            return;
          }
          setStatus("Zusammenfassung gespeichert.");
          saveProgress({ track: "fast", stepId: "step-1", updatedAt: Date.now() });
          exitToStepOne(400);
        } else if (transcriptText) {
          valueRef.current = transcriptText;
          setStatus("Transkription erhalten. Bitte erneut aufnehmen, um eine Zusammenfassung zu erhalten.");
        } else {
          setError("Keine Transkription erhalten. Bitte erneut versuchen.");
          setStatus(null);
        }
      } catch (err) {
        console.error("fast/record upload error", err);
        setError("Aufnahme konnte nicht gesendet werden.");
        setStatus(null);
      } finally {
        setTranscribing(false);
      }
    },
    [exitToStepOne, field, saveFieldValue, userId],
  );

  const startRecording = useCallback(async () => {
    if (recording || transcribing) return;
    setError(null);
    setStatus(null);
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        throw new Error("Media devices not available");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let options: MediaRecorderOptions | undefined;
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      try {
        for (const mime of candidates) {
          if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(mime)) {
            options = { mimeType: mime };
            break;
          }
        }
      } catch {}

      const recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      mediaRef.current = recorder;
      chunksRef.current = [];
      shouldUploadRef.current = false;
      mimeTypeRef.current = options?.mimeType || recorder.mimeType || "audio/webm";
      recordingStartRef.current = Date.now();

      const finalizeUpload = () => {
        if (!shouldUploadRef.current) return;
        const chunks = chunksRef.current.slice();
        if (!chunks.length) return;
        shouldUploadRef.current = false;
        chunksRef.current = [];
        const type = chunks[0]?.type || mimeTypeRef.current || "audio/webm";
        const durationMs = recordingStartRef.current ? Date.now() - recordingStartRef.current : undefined;
        recordingStartRef.current = null;
        const combined = new Blob(chunks, { type });
        void uploadRecording(combined, durationMs);
      };

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
        if (shouldUploadRef.current && recorder.state === "inactive") {
          finalizeUpload();
        }
      };
      recorder.onstop = () => {
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch {}
        streamRef.current = null;
        setRecording(false);
        setPaused(false);
        if (flushTimerRef.current) {
          clearInterval(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        if (shouldUploadRef.current) {
          finalizeUpload();
        } else {
          chunksRef.current = [];
        }
        recordingStartRef.current = null;
      };

      try {
        recorder.start(5000);
      } catch {
        recorder.start();
      }
      flushTimerRef.current = setInterval(() => {
        try {
          if (recorder.state === "recording") recorder.requestData();
        } catch {}
      }, 5000);
      setPaused(false);
      setRecording(true);
    } catch (err) {
      console.error("record start error", err);
      setError("Audioaufnahme nicht möglich. Bitte Mikrofonzugriff erlauben.");
      recordingStartRef.current = null;
    }
  }, [recording, transcribing, uploadRecording]);

  const stopRecording = useCallback(
    ({ upload = true }: { upload?: boolean } = {}) => {
      const recorder = mediaRef.current;
      shouldUploadRef.current = upload;
      if (!recorder || (!recording && !paused)) {
        setRecorderOpen(false);
        setRecording(false);
        setPaused(false);
        if (!upload) {
          exitToStepOne();
        }
        return;
      }
      try {
        if (recorder.state === "recording") {
          try {
            recorder.requestData();
          } catch {}
          recorder.stop();
        } else if (recorder.state === "paused") {
          recorder.stop();
        }
      } catch (err) {
        console.error("record stop error", err);
      } finally {
        setRecorderOpen(false);
        setRecording(false);
        setPaused(false);
        if (!upload) {
          exitToStepOne();
        }
      }
    },
    [exitToStepOne, paused, recording],
  );

  const handlePauseResume = useCallback(async () => {
    const recorder = mediaRef.current;
    if (!recorder || !recording) return;
    try {
      if (!paused) {
        if (recorder.state === "recording") {
          recorder.pause();
          setPaused(true);
        }
      } else if (recorder.state === "paused") {
        recorder.resume();
        setPaused(false);
      }
    } catch (err) {
      console.error("record pause/resume error", err);
    }
  }, [paused, recording]);

  const handlePrimaryAction = useCallback(async () => {
    if (transcribing) return;
    if (!recording) {
      await startRecording();
      return;
    }
    if (paused) {
      await handlePauseResume();
      return;
    }
    stopRecording({ upload: true });
  }, [handlePauseResume, paused, recording, startRecording, stopRecording, transcribing]);

  const handleSend = useCallback(() => {
    if (recording || paused) {
      stopRecording({ upload: true });
    } else {
      exitToStepOne();
    }
  }, [exitToStepOne, paused, recording, stopRecording]);

  const handleBack = useCallback(() => {
    if (recording || paused) {
      stopRecording({ upload: false });
    } else {
      exitToStepOne();
    }
  }, [exitToStepOne, paused, recording, stopRecording]);

  const fieldLabelText = useMemo(() => (field ? fieldLabel(field) : ""), [field]);

  if (!field) {
    return null;
  }

  return (
    <>
      {recorderOpen && (
        <RecordingOverlay
          fieldName={fieldLabelText}
          recording={recording}
          paused={paused}
          disabled={loading || transcribing}
          statusMessage={status}
          errorMessage={error}
          onPrimary={handlePrimaryAction}
          onPauseResume={handlePauseResume}
          onSend={handleSend}
          onBack={handleBack}
        />
      )}
      {transcribing && !recording && <SendingOverlay message="Übertrage deine Antwort…" />}
    </>
  );
}
