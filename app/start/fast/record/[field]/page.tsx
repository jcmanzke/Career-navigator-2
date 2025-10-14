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
import { CONTEXT_HEADER_NAME, FAST_TRACK_CONTEXT } from "@/lib/n8n";

const FIELD_KEYS: FieldKey[] = ["background", "current", "goals"];
const HISTORY_LIMIT = 10;

const FIELD_GUIDANCE: Record<FieldKey, { intro: string; hints: string[] }> = {
  background: {
    intro: "Erzähle kurz von deiner Ausbildung und deinem bisherigen Werdegang.",
    hints: [
      "Welche Stationen oder Abschlüsse waren besonders wichtig?",
      "Gibt es Rollen oder Erfolge, die du hervorheben möchtest?",
    ],
  },
  current: {
    intro: "Beschreibe deine aktuelle Rolle so, als würdest du sie jemandem erklären, der dich nicht kennt.",
    hints: [
      "Was machst du täglich?",
      "Welche Verantwortung oder Zielgrößen hast du?",
      "Mit wem arbeitest du eng zusammen?",
    ],
  },
  goals: {
    intro: "Formuliere, wohin du dich entwickeln möchtest und was dir beruflich wichtig ist.",
    hints: [
      "Welche Ziele möchtest du erreichen?",
      "Welche Themen oder Branchen reizen dich?",
      "Welche Fähigkeiten würdest du gern ausbauen?",
    ],
  },
};

type ConversationMessage = {
  role: "assistant" | "user";
  text: string;
};

const RESPONSE_KEYS = [
  "transcript",
  "text",
  "value",
  "message",
  "result",
  "response",
  "output",
  "content",
  "data",
  "summary",
  "answer",
];

function extractPlainTextResponse(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const tryNode = (node: unknown, depth = 0): string => {
    if (!node || depth > 8) return "";
    if (typeof node === "string") {
      const s = node.trim();
      return s.length ? s : "";
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
      // fall back
    }
  }
  return trimmed;
}

function formatDuration(durationMs?: number): string {
  if (!durationMs || durationMs <= 0) return "—";
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function cls(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function RecordingOverlay({
  fieldName,
  recording,
  paused,
  onPrimary,
  onPauseResume,
  onSend,
  onBack,
}: {
  fieldName: string;
  recording: boolean;
  paused: boolean;
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
      <div className="w-full max-w-md text-center space-y-8">
        <p className="text-small uppercase tracking-[0.3em] text-white/80">{statusText}</p>
        <h2 className="text-2xl font-semibold text-white">Sprich über: {fieldName}</h2>
        <button
          type="button"
          onClick={() => {
            void onPrimary();
          }}
          className="group relative mx-auto flex h-52 w-52 items-center justify-center rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
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
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-neutrals-0 px-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
          <div className="absolute h-full w-full rounded-full border border-white/20" />
          <div className="cn-orbit h-36 w-36 rounded-full" aria-hidden="true" />
          <div className="absolute inset-10 rounded-full bg-primary-500 text-[#2C2C2C] flex items-center justify-center font-semibold">
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
  const [value, setValue] = useState("");
  const [basics, setBasics] = useState<Basics>({ background: "", current: "", goals: "" });
  const [history, setHistory] = useState<HistoryRecord>(emptyHistory);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(true);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [pendingSummary, setPendingSummary] = useState<string | null>(null);
  const [sendingSummary, setSendingSummary] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldUploadRef = useRef(false);
  const mimeTypeRef = useRef<string>("audio/webm");
  const valueRef = useRef("");
  const recordingStartRef = useRef<number | null>(null);
  const basicsRef = useRef<Basics>(basics);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    basicsRef.current = basics;
  }, [basics]);

  useEffect(() => {
    if (!field) {
      router.replace("/start/fast");
      return;
    }
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
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
          .select("basics, history")
          .eq("user_id", user.id)
          .single();

        if (selectError && selectError.code !== "PGRST116") {
          throw selectError;
        }

        if (row) {
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
            .select("basics, history")
            .single();
          if (insertError) throw insertError;
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
        const latestHistory = historyData[field]?.[historyData[field].length - 1]?.text ?? "";
        const initialValue = latestHistory;
        valueRef.current = initialValue;
        setValue(initialValue);

        const guidance = FIELD_GUIDANCE[field];
        const guidanceMessages: ConversationMessage[] = [];
        if (guidance) {
          guidanceMessages.push({ role: "assistant", text: guidance.intro });
        }
        setMessages(guidanceMessages);
      } catch (err) {
        console.error("fast/record load error", err);
        if (active) setError("Konnte Sitzung nicht laden.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
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
        streamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      streamRef.current = null;
    };
  }, []);

  const startRecording = async () => {
    if (recording || transcribing) return;
    setError(null);
    setInfo(null);
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
        const blob = new Blob(chunks, { type });
        const durationMs = recordingStartRef.current ? Date.now() - recordingStartRef.current : undefined;
        recordingStartRef.current = null;
        void uploadRecording(blob, durationMs);
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
      setPendingSummary(null);
    } catch (err) {
      console.error("record start error", err);
      setError("Audioaufnahme nicht möglich. Bitte Mikrofonzugriff erlauben.");
      recordingStartRef.current = null;
    }
  };

  const stopRecording = ({ upload = true }: { upload?: boolean } = {}) => {
    const recorder = mediaRef.current;
    shouldUploadRef.current = upload;
    if (!recorder || (!recording && !paused)) {
      setRecorderOpen(false);
      setRecording(false);
      setPaused(false);
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
    }
  };

  const handlePauseResume = async () => {
    const recorder = mediaRef.current;
    if (!recorder || !recording) return;
    try {
      if (!paused) {
        if (recorder.state === "recording") {
          recorder.pause();
          setPaused(true);
        }
      } else {
        if (recorder.state === "paused") {
          recorder.resume();
          setPaused(false);
        }
      }
    } catch (err) {
      console.error("record pause/resume error", err);
    }
  };

  const handlePrimaryAction = async () => {
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
  };

  const requestFeedback = useCallback(
    async (summary: string) => {
      if (!summary || !field) return false;
      try {
        const res = await fetch("/api/fast-track-webhook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [CONTEXT_HEADER_NAME]: FAST_TRACK_CONTEXT,
            "X-FastTrack-Mode": "feedback",
          },
          body: JSON.stringify({ field, summary }),
        });
        const payloadText = await res.text();
        if (!res.ok) throw new Error(payloadText || "Feedback fehlgeschlagen");
        const guidance = sanitizePlainText(extractPlainTextResponse(payloadText));
        if (guidance) {
          setMessages((msgs) => [...msgs, { role: "assistant", text: guidance }]);
        }
        return true;
      } catch (err) {
        console.error("fast/record feedback error", err);
        return false;
      }
    },
    [field],
  );

  const handleSendSummary = useCallback(async () => {
    const summary = pendingSummary?.trim();
    if (!summary || sendingSummary) return;
    setSendingSummary(true);
    setError(null);
    setInfo(null);
    const ok = await requestFeedback(summary);
    if (ok) {
      setPendingSummary(null);
      setInfo("Zusammenfassung an den Coach gesendet.");
    } else {
      setError("Zusammenfassung konnte nicht gesendet werden.");
    }
    setSendingSummary(false);
  }, [pendingSummary, requestFeedback, sendingSummary]);

  const handleSend = () => {
    if (recording || paused) {
      stopRecording({ upload: true });
      return;
    }
    if (pendingSummary) {
      void handleSendSummary();
      setRecorderOpen(false);
    } else {
      setRecorderOpen(false);
    }
  };

  const handleBack = () => {
    if (recording || paused) {
      stopRecording({ upload: false });
    } else {
      setRecorderOpen(false);
    }
  };

  const openRecorder = () => {
    setError(null);
    setInfo(null);
    setPaused(false);
    setRecorderOpen(true);
  };

  const saveFieldValue = useCallback(
    async (
      rawText: string,
      {
        addHistory = true,
        silent = false,
        durationMs,
      }: { addHistory?: boolean; silent?: boolean; durationMs?: number } = {},
    ): Promise<boolean> => {
      if (!field || !userId) return false;
      const trimmed = sanitizePlainText(rawText).trim();
      if (!trimmed) return false;

      if (!silent) {
        setSaving(true);
        setError(null);
        setInfo(null);
      }

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
          : history;

        const { data, error: upsertError } = await supabase
          .from("fast_scan_sessions")
          .upsert(
            {
              user_id: userId,
              basics: nextBasics,
              history: nextHistory,
              step: 1,
            },
            { onConflict: "user_id" },
          )
          .select("basics, history")
          .single();

        if (upsertError) throw upsertError;

        const mergedBasics: Basics = {
          background: sanitizePlainText(data?.basics?.background ?? ""),
          current: sanitizePlainText(data?.basics?.current ?? ""),
          goals: sanitizePlainText(data?.basics?.goals ?? ""),
        };
        basicsRef.current = mergedBasics;
        const mergedHistory = normalizeHistory(data?.history);

        setBasics(mergedBasics);
        setHistory(mergedHistory);
        valueRef.current = trimmed;
        setValue(trimmed);
        if (!silent) setInfo("Antwort gespeichert.");
        return true;
      } catch (err) {
        console.error("fast/record save error", err);
        if (!silent) setError("Speichern fehlgeschlagen.");
        return false;
      } finally {
        if (!silent) setSaving(false);
      }
    },
    [basics, field, history, userId],
  );

  const uploadRecording = useCallback(
    async (blob: Blob, durationMs?: number) => {
      if (!userId || !field) return;
      try {
        setTranscribing(true);
        setError(null);
        setInfo(null);
        const fd = new FormData();
        const ext = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "mp4" : "webm";
        fd.append("file", blob, `audio-${field}-${Date.now()}.${ext}`);
        fd.append("field", field);
        const latestSummary = sanitizePlainText(basicsRef.current[field] ?? "");
        if (latestSummary) fd.append("latestSummary", latestSummary);
        const response = await fetch("/api/fast-track-webhook", {
          method: "POST",
          headers: {
            [CONTEXT_HEADER_NAME]: FAST_TRACK_CONTEXT,
            "X-FastTrack-Mode": "guidance",
          },
          body: fd,
        });
        const payloadText = await response.text();
        if (!response.ok) {
          throw new Error(payloadText || "Upload fehlgeschlagen");
        }
        const rawParsed = extractPlainTextResponse(payloadText);
        const previousText = valueRef.current;
        let parsedTranscript = "";
        let parsedGuidance = rawParsed;
        try {
          if (payloadText.trim().startsWith("{") || payloadText.trim().startsWith("[")) {
            const parsed = JSON.parse(payloadText);
            const getFromKeys = (keys: string[]): string => {
              for (const key of keys) {
                const value = (parsed as any)?.[key];
                if (typeof value === "string" && value.trim()) return value.trim();
              }
              return "";
            };
            parsedTranscript = getFromKeys(["transcript", "user", "input", "answer"]) || parsedTranscript;
            parsedGuidance = getFromKeys(["guidance", "feedback", "assistant", "text", "message", "response", "output"]) || rawParsed;
          }
        } catch {
          // ignore JSON errors
        }

        const transcriptText = sanitizePlainText(parsedTranscript || previousText);
        const guidanceText = sanitizePlainText(parsedGuidance);

        let effectiveSummary = transcriptText;
        if (transcriptText) {
          valueRef.current = transcriptText;
          setValue(transcriptText);
          const saved = await saveFieldValue(transcriptText, { addHistory: true, silent: true, durationMs });
          if (!saved) setError("Speichern fehlgeschlagen.");
          else effectiveSummary = transcriptText;
        }

        if (effectiveSummary) {
          setPendingSummary(effectiveSummary);
          setInfo("Zusammenfassung erstellt. Prüfe sie und sende sie weiter.");
        }

        if (guidanceText) {
          setMessages((msgs) => [...msgs, { role: "assistant", text: guidanceText }]);
          if (!effectiveSummary) setInfo("Transkription empfangen.");
        }
      } catch (err) {
        console.error("fast/record upload error", err);
        setError("Aufnahme konnte nicht gesendet werden.");
      } finally {
        setTranscribing(false);
      }
    },
    [field, history, saveFieldValue, setMessages, userId],
  );

  const handleSave = async () => {
    if (!field) return;
    if (!userId) {
      setError("Bitte melde dich an, um zu speichern.");
      return;
    }
    const trimmed = valueRef.current.trim();
    if (!trimmed) {
      setError("Bitte zuerst etwas aufnehmen oder eingeben.");
      return;
    }
    const ok = await saveFieldValue(trimmed, { addHistory: true, silent: false });
    if (ok) {
      void requestFeedback(trimmed);
      saveProgress({ track: "fast", stepId: "step-1", updatedAt: Date.now() });
      const index = FIELD_KEYS.indexOf(field);
      const nextField = FIELD_KEYS[index + 1];
      setTimeout(() => {
        if (nextField) {
          router.push(`/start/fast/record/${nextField}`);
        } else {
          router.push("/start/fast");
        }
      }, 800);
    }
  };

  if (!field) {
    return null;
  }

  const fieldLabelText = useMemo(() => (field ? fieldLabel(field) : ""), [field]);

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => router.push("/start/fast")}
          className="text-small text-neutrals-600 hover:text-neutrals-900"
        >
          ← Zurück
        </button>

        <section className="rounded-3xl border border-neutrals-200/60 bg-neutrals-0/60 backdrop-blur-md shadow-elevation2 p-6 space-y-4">
          <div>
            <h1 className="text-xl font-semibold">Aufnahme: {fieldLabel(field)}</h1>
            <p className="text-neutrals-600 mt-1">
              Sprich deine Antwort ein – der Coach führt dich Schritt für Schritt durch die Fragen.
            </p>
          </div>

          {loading ? (
            <div className="text-neutrals-600">Lade…</div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-small text-neutrals-500" htmlFor="guidance-box">
                  Agentenhinweis
                </label>
                <div
                  id="guidance-box"
                  className="w-full rounded-2xl border border-accent-700 bg-white p-3 min-h-[150px] text-small text-neutrals-800 whitespace-pre-wrap"
                >
                  {messages.length
                    ? messages[messages.length - 1].text
                    : "Tippe auf \"Neue Sprachaufnahme\" und erzähle kurz davon."}
                </div>
              </div>

              {pendingSummary && (
                <div className="space-y-2">
                  <label className="text-small text-neutrals-500" htmlFor="summary-box">
                    Deine Zusammenfassung
                  </label>
                  <div
                    id="summary-box"
                    className="w-full rounded-2xl border border-neutrals-200 bg-white p-3 text-small text-neutrals-800 whitespace-pre-wrap"
                  >
                    {pendingSummary}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        void handleSendSummary();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#1D252A] px-4 py-2 font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
                      disabled={sendingSummary || transcribing}
                    >
                      {sendingSummary ? "Sende…" : "An Workbook senden"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingSummary(null)}
                      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-semibold text-neutrals-700 disabled:opacity-60"
                      disabled={sendingSummary}
                    >
                      Verwerfen
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openRecorder}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 font-semibold text-[#2C2C2C] transition-transform hover:scale-[1.01] disabled:opacity-60"
                  disabled={recording || transcribing}
                >
                  <span role="img" aria-hidden="true">
                    🎙️
                  </span>
                  Neue Sprachaufnahme
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-semibold disabled:opacity-60"
                  disabled={saving || (history[field]?.length ?? 0) === 0}
                >
                  {saving ? "Speichere…" : "Weiter"}
                </button>
                {(recording || transcribing) && (
                  <span className="text-small text-neutrals-500">
                    {recording ? "Aufnahme läuft…" : "Übertrage…"}
                  </span>
                )}
              </div>

              {error && <div className="rounded-xl border border-semantic-error-base bg-semantic-error-surface px-3 py-2 text-semantic-error-base">{error}</div>}
              {info && <div className="rounded-xl border border-semantic-success-base bg-semantic-success-surface px-3 py-2 text-semantic-success-base">{info}</div>}
            </>
          )}
        </section>

        {history[field]?.length ? (
          <section className="rounded-3xl border border-neutrals-200/60 bg-neutrals-0/40 backdrop-blur-md shadow-elevation1 p-6">
            <h2 className="text-lg font-semibold mb-3">Aufnahmen</h2>
            <ul className="space-y-3">
              {[...history[field]].reverse().map((entry) => {
                const date = new Date(entry.timestamp);
                const duration = formatDuration(entry.durationMs);
                return (
                  <li key={entry.timestamp} className="rounded-2xl border border-neutrals-200 bg-white p-3">
                    <div className="flex items-center justify-between text-small text-neutrals-600">
                      <span>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="text-neutrals-500">Dauer: {duration}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
      {recorderOpen && (
        <RecordingOverlay
          fieldName={fieldLabelText}
          recording={recording}
          paused={paused}
          onPrimary={handlePrimaryAction}
          onPauseResume={handlePauseResume}
          onSend={handleSend}
          onBack={handleBack}
        />
      )}
      {transcribing && !recording && <SendingOverlay message="Übertrage deine Antwort…" />}
    </main>
  );
}
