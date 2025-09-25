"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  inputFieldLabel,
  normalizeHistory,
} from "../../shared";

const FIELD_KEYS: FieldKey[] = ["background", "current", "goals"];
const HISTORY_LIMIT = 10;

function cls(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function RecordingOverlay({ fieldName, onStop }: { fieldName: string; onStop: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm text-neutrals-0 px-6">
      <div className="w-full max-w-md text-center space-y-8">
        <p className="text-small uppercase tracking-[0.3em] text-white/70">Aufnahme läuft</p>
        <h2 className="text-2xl font-semibold">Sprich über: {fieldName}</h2>
        <div className="relative mx-auto flex h-52 w-52 items-center justify-center">
          <div className="absolute inset-0 rounded-full cn-pulse-ring" aria-hidden="true" />
          <div className="absolute inset-6 rounded-full cn-pulse-ring-delay" aria-hidden="true" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-primary-500 text-[#2C2C2C] shadow-elevation4">
            <span role="img" aria-hidden="true" className="text-4xl">
              🎙️
            </span>
          </div>
        </div>
        <p className="text-neutrals-200">
          Du kannst jederzeit auf „Aufnahme beenden“ tippen. Deine Aufnahme wird anschließend automatisch übertragen.
        </p>
        <button
          type="button"
          onClick={onStop}
          className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-[#1D252A] shadow-elevation3 hover:bg-neutrals-100"
        >
          Aufnahme beenden
        </button>
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
  const [transcribing, setTranscribing] = useState(false);
  const [value, setValue] = useState("");
  const [basics, setBasics] = useState<Basics>({ background: "", current: "", goals: "" });
  const [history, setHistory] = useState<HistoryRecord>(emptyHistory);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
            background: row.basics?.background ?? "",
            current: row.basics?.current ?? "",
            goals: row.basics?.goals ?? "",
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
            background: created?.basics?.background ?? "",
            current: created?.basics?.current ?? "",
            goals: created?.basics?.goals ?? "",
          };
          historyData = normalizeHistory(created?.history);
        }

        if (!active) return;
        setBasics(basicsData);
        setHistory(historyData);
        setValue(basicsData[field] ?? "");
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

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch {}
        streamRef.current = null;
        setRecording(false);
        if (flushTimerRef.current) {
          clearInterval(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        void transcribeChunks();
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
      setRecording(true);
    } catch (err) {
      console.error("record start error", err);
      setError("Audioaufnahme nicht möglich. Bitte Mikrofonzugriff erlauben.");
    }
  };

  const stopRecording = () => {
    if (!recording) return;
    const recorder = mediaRef.current;
    if (!recorder) return;
    try {
      if (recorder.state === "recording") {
        try {
          recorder.requestData();
        } catch {}
        recorder.stop();
      }
    } catch (err) {
      console.error("record stop error", err);
    }
  };

  const transcribeChunks = async () => {
    if (!chunksRef.current.length) return;
    setTranscribing(true);
    setError(null);
    setInfo(null);
    try {
      const firstType = chunksRef.current[0]?.type || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: firstType });
      const ext = firstType.includes("mp4") ? "mp4" : firstType.includes("ogg") ? "ogg" : "webm";
      const fd = new FormData();
      fd.append("file", blob, `audio.${ext}`);
      const res = await fetch(`/api/transcribe?t=${Date.now()}`, {
        method: "POST",
        body: fd,
        cache: "no-store",
      } as RequestInit);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.text) {
        throw new Error(data?.detail || data?.error || "Transkription fehlgeschlagen");
      }
      setValue((prev) => {
        const trimmed = String(data.text).trim();
        if (!prev) return trimmed;
        const sep = prev.endsWith(" ") ? "" : " ";
        return (prev + sep + trimmed).trim();
      });
      setInfo("Transkription hinzugefügt.");
    } catch (err) {
      console.error("transcribe error", err);
      setError("Fehler bei der Transkription.");
    } finally {
      chunksRef.current = [];
      setTranscribing(false);
    }
  };

  const handleSave = async () => {
    if (!field) return;
    if (!userId) {
      setError("Bitte melde dich an, um zu speichern.");
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Bitte zuerst etwas aufnehmen oder eingeben.");
      return;
    }
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const supabase = createClient();
      const nextBasics: Basics = { ...basics, [field]: trimmed };
      const existing: HistoryEntry[] = history[field] ?? [];
      const nextEntries = [...existing, { timestamp: Date.now(), text: trimmed }];
      const limitedEntries = nextEntries.slice(-HISTORY_LIMIT);
      const nextHistory: HistoryRecord = {
        ...history,
        [field]: limitedEntries,
      };

      const { data, error: upsertError } = await supabase
        .from("fast_scan_sessions")
        .upsert({ user_id: userId, basics: nextBasics, history: nextHistory, step: 1 })
        .select("basics, history")
        .single();

      if (upsertError) throw upsertError;

      const mergedBasics: Basics = {
        background: data?.basics?.background ?? "",
        current: data?.basics?.current ?? "",
        goals: data?.basics?.goals ?? "",
      };
      const mergedHistory = normalizeHistory(data?.history);

      setBasics(mergedBasics);
      setHistory(mergedHistory);
      setValue(mergedBasics[field] ?? "");
      setInfo("Antwort gespeichert.");
      saveProgress({ track: "fast", stepId: "step-1", updatedAt: Date.now() });
    } catch (err) {
      console.error("fast/record save error", err);
      setError("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
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
              Sprich deine Antwort ein oder ergänze sie per Tastatur. Du kannst mehrere Aufnahmen machen; jede Transkription wird angehängt.
            </p>
          </div>

          {loading ? (
            <div className="text-neutrals-600">Lade…</div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-small text-neutrals-500" htmlFor="record-textarea">
                  {inputFieldLabel(field)}
                </label>
                <textarea
                  id="record-textarea"
                  className="w-full rounded-2xl border border-accent-700 bg-white p-3 min-h-[150px]"
                  placeholder={`Beschreibe ${inputFieldLabel(field).toLowerCase()}…`}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  disabled={transcribing}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  className={cls(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold",
                    recording ? "bg-red-500 text-white" : "bg-primary-500 text-[#2C2C2C]",
                  )}
                  disabled={transcribing}
                >
                  <span role="img" aria-hidden="true">
                    🎙️
                  </span>
                  {recording ? "Aufnahme beenden" : "Aufnahme starten"}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 border font-semibold"
                  disabled={saving || !value.trim()}
                >
                  {saving ? "Speichere…" : "Übernehmen"}
                </button>
                {transcribing && <span className="text-small text-neutrals-500">Transkribiere…</span>}
              </div>

              {error && <div className="rounded-xl border border-semantic-error-base bg-semantic-error-surface px-3 py-2 text-semantic-error-base">{error}</div>}
              {info && <div className="rounded-xl border border-semantic-success-base bg-semantic-success-surface px-3 py-2 text-semantic-success-base">{info}</div>}
            </>
          )}
        </section>

        {history[field]?.length ? (
          <section className="rounded-3xl border border-neutrals-200/60 bg-neutrals-0/40 backdrop-blur-md shadow-elevation1 p-6">
            <h2 className="text-lg font-semibold mb-3">Verlauf</h2>
            <ul className="space-y-3">
              {[...history[field]].reverse().map((entry) => (
                <li key={entry.timestamp} className="rounded-2xl border border-neutrals-200 bg-white p-3">
                  <p className="text-small text-neutrals-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{entry.text}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      {recording && <RecordingOverlay fieldName={fieldLabelText} onStop={stopRecording} />}
      {transcribing && !recording && <SendingOverlay message="Übertrage deine Antwort…" />}
    </main>
  );
}
