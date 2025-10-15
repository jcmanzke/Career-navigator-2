"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CONTEXT_HEADER_NAME, FAST_TRACK_CONTEXT } from "@/lib/n8n";
import { FieldKey, fieldLabel, sanitizePlainText } from "./shared";

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

type FastTrackRecorderModalProps = {
  field: FieldKey | null;
  open: boolean;
  onClose: () => void;
  onSave: (field: FieldKey, summary: string, durationMs?: number) => Promise<boolean>;
  initialValue?: string;
};

function cls(...values: (string | false | null | undefined)[]) {
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
      // ignore JSON parse errors
    }
  }
  return trimmed;
}

function pickMimeType(): string {
  const preferred = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  for (const type of preferred) {
    if (typeof window !== "undefined" && (MediaRecorder as any)?.isTypeSupported?.(type)) {
      return type;
    }
  }
  return "audio/webm";
}

export function FastTrackRecorderModal({ field, open, onClose, onSave, initialValue }: FastTrackRecorderModalProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number | null>(null);
  const shouldUploadRef = useRef(true);
  const mimeTypeRef = useRef<string>("audio/webm");

  useEffect(() => {
    if (open) {
      setValue(initialValue ?? "");
      setError(null);
      setInfo(null);
    }
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) {
      cleanupMedia(false).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fieldLabelText = useMemo(() => (field ? fieldLabel(field) : ""), [field]);

  const cleanupMedia = async (upload: boolean) => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      shouldUploadRef.current = upload;
      recorder.stop();
      return;
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    chunksRef.current = [];
    recordingStartRef.current = null;
    setRecording(false);
  };

  const processBlob = async (blob: Blob, durationMs?: number) => {
    if (!field) return;
    setTranscribing(true);
    setError(null);
    setInfo(null);
    try {
      const fd = new FormData();
      const ext = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "mp4" : "webm";
      fd.append("file", blob, `audio-${field}-${Date.now()}.${ext}`);
      fd.append("field", field);
      const latest = sanitizePlainText(initialValue ?? "");
      if (latest) {
        fd.append("latestSummary", latest);
      }
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

      const fallbackPlain = sanitizePlainText(extractPlainTextResponse(payloadText));
      const trimmedPayload = payloadText.trim();
      let parsedSummary = "";
      let parsedTranscript = "";
      if (trimmedPayload.startsWith("{") || trimmedPayload.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmedPayload);
          parsedSummary = extractFromNode(parsed, ["summary", "result", "value"]);
          parsedTranscript = extractFromNode(parsed, ["transcript", "user", "input", "answer"]);
        } catch {
          // ignore JSON errors
        }
      }

      const summaryText = sanitizePlainText(
        parsedSummary || parsedTranscript || fallbackPlain || value,
      );
      const transcriptText = sanitizePlainText(parsedTranscript || fallbackPlain || value);
      if (summaryText) {
        setValue(summaryText);
        setSaving(true);
        const ok = await onSave(field, summaryText, durationMs);
        setSaving(false);
        if (ok) {
          setInfo("Zusammenfassung gespeichert.");
          setTimeout(() => {
            onClose();
          }, 600);
        } else {
          setError("Speichern fehlgeschlagen.");
        }
      } else if (transcriptText) {
        setValue(transcriptText);
        setInfo("Transkription empfangen.");
      }
    } catch (err) {
      console.error("fast-track recorder upload error", err);
      setError(err instanceof Error ? err.message : "Aufnahme konnte nicht gesendet werden.");
    } finally {
      setTranscribing(false);
    }
  };

  const handleRecorderStop = async () => {
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    const chunks = chunksRef.current;
    chunksRef.current = [];
    const durationMs = recordingStartRef.current ? Date.now() - recordingStartRef.current : undefined;
    recordingStartRef.current = null;
    setRecording(false);
    if (shouldUploadRef.current && chunks.length > 0) {
      const blob = new Blob(chunks, { type: mimeTypeRef.current });
      await processBlob(blob, durationMs);
    }
    shouldUploadRef.current = true;
  };

  const startRecording = async () => {
    if (!field || recording || transcribing) return;
    try {
      setError(null);
      setInfo(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        void handleRecorderStop();
      };
      recorder.start();
      recordingStartRef.current = Date.now();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      console.error("fast-track recorder start error", err);
      setError("Konnte keine Aufnahme starten. Bitte erlaube den Mikrofonzugriff.");
      cleanupMedia(false).catch(() => undefined);
    }
  };

  const stopRecording = async (upload: boolean) => {
    shouldUploadRef.current = upload;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else if (!upload) {
      await cleanupMedia(false);
    }
  };

  const handleClose = async () => {
    await stopRecording(false);
    onClose();
  };

  const handleManualSave = async () => {
    if (!field) return;
    const trimmed = sanitizePlainText(value).trim();
    if (!trimmed) {
      setError("Bitte zuerst etwas aufnehmen oder eingeben.");
      return;
    }
    try {
      setError(null);
      setInfo(null);
      setSaving(true);
      const ok = await onSave(field, trimmed);
      setSaving(false);
      if (ok) {
        setInfo("Zusammenfassung gespeichert.");
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setError("Speichern fehlgeschlagen.");
      }
    } catch (err) {
      console.error("fast-track recorder manual save error", err);
      setError("Speichern fehlgeschlagen.");
      setSaving(false);
    }
  };

  if (!open || !field) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-elevation3 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-small uppercase tracking-[0.3em] text-neutrals-500">Sprachaufnahme</p>
            <h2 className="text-xl font-semibold text-neutrals-900">{fieldLabelText}</h2>
            <p className="text-small text-neutrals-600 mt-1">
              Nimm deine Antwort auf oder passe den Text direkt an. Die Zusammenfassung wird automatisch in Schritt 2 übernommen.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-neutrals-500 hover:text-neutrals-900 hover:bg-neutrals-100"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={recording ? () => stopRecording(true) : startRecording}
              className={cls(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold transition-transform",
                recording ? "bg-semantic-error-base text-white" : "bg-primary-500 text-[#2C2C2C]",
                "hover:scale-[1.01]"
              )}
              disabled={transcribing}
            >
              <span role="img" aria-hidden="true">
                {recording ? "■" : "🎙️"}
              </span>
              {recording ? "Aufnahme beenden" : "Aufnahme starten"}
            </button>
            <button
              type="button"
              onClick={handleManualSave}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-semibold"
              disabled={saving || transcribing}
            >
              {saving ? "Speichere…" : "Speichern"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-neutrals-600 hover:text-neutrals-900"
            >
              Abbrechen
            </button>
          </div>
          {recording && (
            <div className="text-small text-semantic-error-base">Aufnahme läuft… Tippe erneut, um zu beenden.</div>
          )}
          {transcribing && <div className="text-small text-neutrals-500">Transkribiere…</div>}
        </div>

        <div className="space-y-2">
          <label htmlFor="fast-recorder-text" className="text-small text-neutrals-500">
            Zusammenfassung
          </label>
          <textarea
            id="fast-recorder-text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-full min-h-[160px] rounded-2xl border border-neutrals-200 p-3 text-small text-neutrals-900"
            placeholder="Ergebnis deiner Aufnahme erscheint hier."
          />
        </div>

        {error && (
          <div className="rounded-xl border border-semantic-error-base bg-semantic-error-surface px-3 py-2 text-semantic-error-base">
            {error}
          </div>
        )}
        {info && !error && (
          <div className="rounded-xl border border-semantic-success-base bg-semantic-success-surface px-3 py-2 text-semantic-success-base">
            {info}
          </div>
        )}
      </div>
    </div>
  );
}
