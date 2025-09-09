"use client";

import Head from "next/head";
import { useEffect, useRef } from "react";
import AuthForm from "../AuthForm";

export default function LoginPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    try { v.muted = true; v.defaultMuted = true; } catch {}
    // Try to start playback proactively (helps Safari/iOS)
    const tryPlay = () => v.play().catch(() => {});
    const onLoaded = () => tryPlay();
    const onCanPlay = () => tryPlay();
    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("canplay", onCanPlay);
    // Nudge playback shortly after mount as well
    const t = setTimeout(tryPlay, 100);
    return () => {
      clearTimeout(t);
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("canplay", onCanPlay);
    };
  }, []);
  return (
    <div className="relative min-h-screen bg-[url('/login-poster.png')] bg-cover bg-center">
      <Head>
        <link rel="preload" as="video" href="/852422-hd_1920_1080_24fps.mp4" />
        <link rel="preload" as="image" href="/login-poster.png" />
      </Head>
      {/* Background video */}
      <video
        ref={videoRef}
        className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover motion-reduce:hidden block"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/login-poster.png"
        src="/852422-hd_1920_1080_24fps.mp4"
        aria-hidden="true"
      />

      {/* Contrast overlay */}
      <div className="fixed inset-0 z-0 bg-neutrals-900/20 backdrop-blur-[1px]" aria-hidden="true" />

      {/* Foreground content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="space-y-4 text-center rounded-3xl border border-accent-700 bg-neutrals-0/80 backdrop-blur-md p-6">
          <AuthForm mode="login" />
          <a href="/signup" className="text-small text-primary-500 underline">
            Need an account? Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
