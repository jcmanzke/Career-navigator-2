import { useEffect, useRef, useState } from "react";

interface VoiceTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

type IntervalHandle = ReturnType<typeof setInterval> | null;
type TimeoutHandle = ReturnType<typeof setTimeout> | null;

export function VoiceTextarea({ value, onChange, placeholder }: VoiceTextareaProps) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [lastTranscript, setLastTranscript] = useState("");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<IntervalHandle>(null);
  const chunksRef = useRef<Blob[]>([]);
  const progressTimerRef = useRef<IntervalHandle>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const resetProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const transcribeAll = async () => {
    try {
      setTranscribing(true);
      setTranscribeProgress(0);
      setDisplayProgress(0);
      resetProgressTimer();

      progressTimerRef.current = setInterval(() => {
        setDisplayProgress((current) => {
          const target = 95;
          if (current < target) {
            const delta = current < 60 ? 2 : 1;
            return Math.min(target, current + delta);
          }
          return current;
        });
      }, 120);

      const firstType = chunksRef.current[0]?.type ?? "audio/webm";
      const mimeType = firstType || "audio/webm";
      const ext = mimeType.includes("mp4")
        ? "mp4"
        : mimeType.includes("ogg")
        ? "ogg"
        : "webm";
      const combined = new Blob(chunksRef.current, { type: mimeType });

      let data: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const fd = new FormData();
          fd.append("file", combined, `audio.${ext}`);
          const response = await fetch(`/api/transcribe?t=${Date.now()}`, {
            method: "POST",
            body: fd,
            cache: "no-store",
          });
          data = await response.json().catch(() => ({}));
          if (response.ok && data) break;
        } catch {
          // ignore and retry
        }
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }

      if (data?.text) {
        setLastTranscript(data.text);
        const base = valueRef.current || "";
        const separator = base && !base.endsWith(" ") ? " " : "";
        const next = (base + separator + data.text).trimStart();
        onChange(next);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTranscribing(false);
      setTranscribeProgress(100);
      setDisplayProgress(100);
      resetProgressTimer();
      setTimeout(() => setDisplayProgress(100), 150);
      chunksRef.current = [];
    }
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    } catch {
      // ignore
    }
    streamRef.current = null;
  };

  const toggle = async () => {
    if (recording) {
      try {
        const mediaRecorder = mediaRef.current;
        stopTimer();
        if (mediaRecorder) {
          await new Promise<void>((resolve) => {
            let settled = false;
            const handler = () => {
              if (settled) return;
              settled = true;
              try {
                mediaRecorder.removeEventListener("dataavailable", handler as any);
              } catch {
                // ignore
              }
              resolve();
            };
            try {
              mediaRecorder.addEventListener("dataavailable", handler as any, { once: true } as any);
            } catch {
              // ignore
            }
            try {
              (mediaRecorder as any).requestData?.();
            } catch {
              // ignore
            }
            setTimeout(() => {
              if (settled) return;
              settled = true;
              try {
                mediaRecorder.removeEventListener("dataavailable", handler as any);
              } catch {
                // ignore
              }
              resolve();
            }, 300);
          });
          try {
            mediaRecorder.stop();
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
      return;
    }

    try {
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
        for (const candidate of candidates) {
          if (
            typeof MediaRecorder !== "undefined" &&
            MediaRecorder.isTypeSupported?.(candidate)
          ) {
            options = { mimeType: candidate };
            break;
          }
        }
      } catch {
        // ignore
      }
      const mediaRecorder = options
        ? new MediaRecorder(stream, options)
        : new MediaRecorder(stream);
      mediaRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        stopStream();
        stopTimer();
        setRecording(false);
        setTimeout(() => {
          void transcribeAll();
        }, 100);
      };

      try {
        mediaRecorder.start(5000);
      } catch {
        try {
          mediaRecorder.start();
        } catch {
          // ignore
        }
      }

      timerRef.current = setInterval(() => {
        try {
          if (mediaRecorder.state === "recording") {
            mediaRecorder.requestData();
          }
        } catch {
          // ignore
        }
      }, 5000);

      setRecording(true);
    } catch (error) {
      console.error(error);
    }
  };

  const deleteLast = () => {
    if (!lastTranscript) return;
    if (value.endsWith(lastTranscript)) {
      const next = value.slice(0, -lastTranscript.length).trim();
      onChange(next);
    }
    setLastTranscript("");
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-end gap-2">
        {recording && <span className="text-small text-neutrals-600">Recording…</span>}
        {transcribing && (
          <span className="text-small text-neutrals-600">
            Transcribing… {displayProgress}%
          </span>
        )}
        {!recording && lastTranscript && (
          <button type="button" onClick={deleteLast} className="rounded-xl border px-2 py-1">
            Delete last
          </button>
        )}
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-1 rounded-xl bg-[#1D252A] px-2 py-1 text-white hover:bg-primary-500 hover:text-neutrals-900"
        >
          <span role="img" aria-hidden="true">
            🎙️
          </span>
          {recording ? "Stop" : "Record"}
        </button>
      </div>
      <textarea
        className="mb-2 w-full rounded-2xl border border-accent-700 p-3"
        rows={2}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
