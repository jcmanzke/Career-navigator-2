"use client";

import { useEffect, useRef, useState } from "react";
import AuthForm from "../AuthForm";

export default function LoginPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showPoster, setShowPoster] = useState(true);
  const [needsTap, setNeedsTap] = useState(false);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [headerTop, setHeaderTop] = useState<number>(80);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    try { v.muted = true; v.defaultMuted = true; } catch {}
    // Try to start playback proactively (helps Safari/iOS)
    const tryPlay = () => v.play().then(() => setShowPoster(false)).catch(() => {});
    const onLoaded = () => tryPlay();
    const onCanPlay = () => tryPlay();
    const onPlaying = () => setShowPoster(false);
    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("playing", onPlaying);
    // Nudge playback shortly after mount as well
    const t = setTimeout(tryPlay, 100);
    // If autoplay still hasn't started after 1s, show tap CTA
    const tapTimer = setTimeout(() => {
      try {
        if (v.paused) setNeedsTap(true);
      } catch {}
    }, 1000);
    return () => {
      clearTimeout(t);
      clearTimeout(tapTimer);
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("playing", onPlaying);
    };
  }, []);

  // Position header vertically centered between top of screen and top of card
  useEffect(() => {
    const reposition = () => {
      const card = cardRef.current;
      const header = headerRef.current;
      if (!card || !header) return;
      const cardRect = card.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const available = Math.max(0, cardRect.top); // space from screen top to card top
      const top = Math.max(12, Math.round((available - headerRect.height) / 2));
      setHeaderTop(top);
    };
    reposition();
    window.addEventListener("resize", reposition);
    const t = setInterval(reposition, 300); // account for font/video loading shifts
    return () => { window.removeEventListener("resize", reposition); clearInterval(t); };
  }, []);
  return (
    <div className="relative min-h-screen">
      {/* Poster layer (visible until video plays) */}
      <img
        src="/login-poster.png"
        alt=""
        aria-hidden="true"
        className={`fixed inset-0 z-0 h-full w-full object-cover transition-opacity duration-300 ${showPoster ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Background video */}
      <video
        ref={videoRef}
        className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover motion-reduce:hidden block"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        src="/852422-hd_1920_1080_24fps.mp4"
        aria-hidden="true"
      />

      {/* Contrast overlay */}
      <div className="fixed inset-0 z-0 bg-neutrals-900/20 backdrop-blur-[1px]" aria-hidden="true" />

      {/* Foreground content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div ref={headerRef} className="absolute left-0 right-0 text-center" style={{ top: headerTop }}>
          <h1 className="font-display font-bold text-white text-[48px] md:text-[72px] lg:text-[88px]">Career Navigator</h1>
        </div>
        <div ref={cardRef} className="flex flex-col gap-3 items-center rounded-3xl border border-accent-700 bg-neutrals-0/80 backdrop-blur-md p-5 pt-6 max-w-sm w-full">
          <AuthForm mode="login" />
          <a href="/signup" className="mt-12 md:mt-16 lg:mt-20 text-center text-small text-[#2C2C2C] underline">
            Need an account? Sign up
          </a>
        </div>
      </div>
      {needsTap && (
        <button
          type="button"
          onClick={() => { try { videoRef.current?.play(); setShowPoster(false); setNeedsTap(false); } catch {} }}
          className="fixed bottom-4 right-4 z-20 px-3 py-1.5 rounded-full bg-neutrals-900/70 text-neutrals-0 text-small shadow-elevation2"
        >
          Tap to animate background
        </button>
      )}
    </div>
  );
}
