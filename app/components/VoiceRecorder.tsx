"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
}

export default function VoiceRecorder({ open, onClose, onResult }: Props) {
  const [recording, setRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (open) {
      start();
    } else {
      cleanup();
    }
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;

      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      mr.start();
      setRecording(true);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        // amplify a bit so that normal speech lights up most bars
        const level = Math.min(1, rms * 5);
        setVolume(level);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.error(e);
      onClose();
    }
  };

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try { analyserRef.current?.disconnect(); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    const mr = mediaRef.current;
    if (mr && mr.state !== "inactive") {
      try { mr.stop(); } catch {}
    }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    setRecording(false);
  };

  const cancel = () => {
    cleanup();
    onClose();
  };

  const stop = async () => {
    cleanup();
    setTranscribing(true);
    try {
      const blob = new Blob(chunksRef.current, {
        type: chunksRef.current[0]?.type || "audio/webm",
      });
      const fd = new FormData();
      fd.append("file", blob, "audio.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (data?.text) {
        onResult(data.text);
      }
    } catch (e) {
      console.error(e);
    }
    setTranscribing(false);
    onClose();
  };

  if (!open) return null;

  const bars = 20;
  const active = Math.round(volume * bars);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={cancel}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-sm text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-0.5 h-8 mb-4 justify-center items-end">
          {Array.from({ length: bars }).map((_, i) => {
            let color = "bg-gray-200";
            if (i < active) {
              const pct = i / bars;
              if (pct < 0.5) color = "bg-green-400";
              else if (pct < 0.8) color = "bg-yellow-300";
              else color = "bg-red-500";
            }
            return <div key={i} className={`w-1 flex-1 ${color}`}></div>;
          })}
        </div>
        {!transcribing && (
          <button
            type="button"
            onClick={stop}
            className="px-4 py-2 rounded-xl bg-primary-500 text-[#2C2C2C] font-semibold"
          >
            Stop
          </button>
        )}
        {transcribing && <p className="text-sm text-neutrals-700">Transcribing…</p>}
      </div>
    </div>
  );
}
