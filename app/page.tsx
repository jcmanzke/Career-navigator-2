"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import CareerNavigatorLoader from "./CareerNavigatorLoader";
import AuthForm from "./AuthForm";
import { createClient } from "@/utils/supabase/client";

export default function Page() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showPoster, setShowPoster] = useState(true);
  const [needsTap, setNeedsTap] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      });
      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setSession(session);
        }
      );
      unsubscribe = () => listener.subscription.unsubscribe();
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
      setLoading(false);
    }
    return unsubscribe;
  }, []);

  if (loading) return null;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-semantic-error-base">{error}</p>
      </div>
    );
  }

  // Setup background video autoplay assistance for the unauthenticated view
  useEffect(() => {
    if (session) return; // only apply when logged out
    const v = videoRef.current;
    if (!v) return;
    try { v.muted = true; (v as any).defaultMuted = true; } catch {}
    const tryPlay = () => v.play().then(() => setShowPoster(false)).catch(() => {});
    const onLoaded = () => tryPlay();
    const onCanPlay = () => tryPlay();
    const onPlaying = () => setShowPoster(false);
    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("playing", onPlaying);
    const t = setTimeout(tryPlay, 100);
    const tapTimer = setTimeout(() => {
      try { if (v.paused) setNeedsTap(true); } catch {}
    }, 1000);
    return () => {
      clearTimeout(t);
      clearTimeout(tapTimer);
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("playing", onPlaying);
    };
  }, [session]);

  if (!session) {
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
        {/* Overlay */}
        <div className="fixed inset-0 z-0 bg-neutrals-900/20 backdrop-blur-[1px]" aria-hidden="true" />
        {/* Foreground content */}
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <div className="space-y-4 text-center rounded-3xl border border-accent-700 bg-neutrals-0/80 backdrop-blur-md p-6">
            <AuthForm mode={authMode} />
            <button
              onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
              className="text-small text-primary-500 underline"
            >
              {authMode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
            </button>
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

  return <CareerNavigatorLoader />;
}
