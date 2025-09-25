"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function cls(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(" ");
}

export default function VoiceCoachPage() {
  const router = useRouter();
  const [recording, setRecording] = useState(false);

  return (
    <main className="min-h-screen bg-[#0B1218] text-white flex flex-col">
      <div
        className="flex-1 flex flex-col items-center justify-between w-full max-w-sm mx-auto px-6 pt-12 pb-10"
        style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <header className="w-full text-center space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Sprach-Coach</p>
          <h1 className="text-3xl font-semibold">Sprachaufnahme</h1>
          <p className="text-sm text-white/70">
            Hier kannst du deine Stimme aufnehmen. Tippe auf den Kreis, um zu starten, und erneut, um die Aufnahme zu pausieren.
          </p>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="relative flex items-center justify-center">
            <span
              aria-hidden="true"
              className={cls(
                "absolute h-52 w-52 rounded-full bg-primary-500/20 blur-xl transition-opacity duration-300",
                recording ? "opacity-100" : "opacity-0",
              )}
            />
            <button
              type="button"
              aria-pressed={recording}
              onClick={() => setRecording((prev) => !prev)}
              className={cls(
                "relative flex h-44 w-44 items-center justify-center rounded-full text-base font-semibold transition-all duration-300 shadow-elevation4 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40",
                recording ? "bg-primary-500 text-[#1D252A] scale-105" : "bg-white/95 text-[#1D252A]",
              )}
            >
              {recording ? "Pause" : "Start"}
            </button>
          </div>
          <p className="text-sm text-white/70">{recording ? "Aufnahme läuft…" : "Tippe auf den Kreis, um loszulegen."}</p>
        </div>

        <div className="w-full grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-12 rounded-full border border-white/30 text-sm font-semibold text-white transition hover:border-white/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="h-12 rounded-full bg-primary-500 text-sm font-semibold text-[#1D252A] transition hover:bg-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
            onClick={() => setRecording(false)}
          >
            Senden
          </button>
        </div>
      </div>
    </main>
  );
}
