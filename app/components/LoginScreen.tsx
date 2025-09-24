"use client";

import { useEffect, useRef, useState } from "react";
import AuthForm from "@/app/AuthForm";

export default function LoginScreen() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [showPoster, setShowPoster] = useState(true);
  const [needsTap, setNeedsTap] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Login view helpers + ping-pong video playback --------------------------
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let reversing = false;
    let rafId: number | null = null;

    const cancelRaf = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    try {
      v.muted = true;
      (v as any).defaultMuted = true;
      v.loop = false;
      v.playbackRate = 1;
    } catch {}

    const tryPlay = () => v.play().then(() => setShowPoster(false)).catch(() => {});
    const onLoaded = () => tryPlay();
    const onCanPlay = () => tryPlay();
    const onPlaying = () => setShowPoster(false);

    const reverseStep = () => {
      if (!reversing) return;
      const step = 1 / 60; // seconds
      try {
        v.currentTime = Math.max(0, v.currentTime - step);
        if (v.currentTime <= 0.01) {
          reversing = false;
          v.currentTime = 0;
          v.play().catch(() => {});
          return;
        }
      } catch {}
      rafId = requestAnimationFrame(reverseStep);
    };

    const onEnded = () => {
      cancelRaf();
      reversing = true;
      try {
        v.pause();
      } catch {}
      rafId = requestAnimationFrame(reverseStep);
    };

    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("ended", onEnded);
    const t = setTimeout(tryPlay, 100);
    const tapTimer = setTimeout(() => {
      try {
        if (v.paused) setNeedsTap(true);
      } catch {}
    }, 1000);

    return () => {
      clearTimeout(t);
      clearTimeout(tapTimer);
      cancelRaf();
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("ended", onEnded);
    };
  }, []);

  // Position header vertically centered between screen top and card top
  useEffect(() => {
    const reposition = () => {
      const card = cardRef.current;
      const header = headerRef.current;
      if (!card || !header) return;
      const cardRect = card.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const available = Math.max(0, cardRect.top);
      const top = Math.max(12, Math.round((available - headerRect.height) / 2));
      header.style.top = `${top}px`;
    };
    reposition();
    window.addEventListener("resize", reposition);
    const t = setInterval(reposition, 300);
    return () => {
      window.removeEventListener("resize", reposition);
      clearInterval(t);
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      <img
        src="/login-poster.png"
        alt=""
        aria-hidden="true"
        className={`fixed inset-0 z-0 h-full w-full object-cover transition-opacity duration-300 ${showPoster ? "opacity-100" : "opacity-0"}`}
      />
      <video
        ref={videoRef}
        className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover motion-reduce:hidden block"
        autoPlay
        muted
        playsInline
        preload="auto"
        src="/852422-hd_1920_1080_24fps.mp4"
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-0 bg-neutrals-900/20 backdrop-blur-[1px]" aria-hidden="true" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div ref={headerRef} className="absolute left-0 right-0 text-center">
          <h1 className="font-display font-bold text-white text-[48px] md:text-[72px] lg:text-[88px]">Career Navigator</h1>
        </div>
        <div ref={cardRef} className="flex flex-col gap-4 items-center rounded-3xl border border-accent-700 bg-neutrals-0/80 backdrop-blur-md p-6 pt-7 max-w-sm w-full">
          <AuthForm mode={authMode} />
          <button
            onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
            className="mt-10 text-center text-small text-[#2C2C2C] underline"
          >
            {authMode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
          </button>
        </div>
      </div>
      {needsTap && (
        <button
          type="button"
          onClick={() => {
            try {
              videoRef.current?.play();
              setShowPoster(false);
              setNeedsTap(false);
            } catch {}
          }}
          className="fixed bottom-4 right-4 z-20 px-3 py-1.5 rounded-full bg-neutrals-900/70 text-neutrals-0 text-small shadow-elevation2"
        >
          Tap to animate background
        </button>
      )}
    </div>
  );
}
