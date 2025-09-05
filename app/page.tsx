"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import CareerNavigatorLoader from "./CareerNavigatorLoader";
import AuthForm from "./AuthForm";
import { getSupabaseClient } from "../lib/supabaseClient";

export default function Page() {
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return null;

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <AuthForm mode={authMode} />
          <button
            onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
            className="text-sm text-blue-600 underline"
          >
            {authMode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
          </button>
        </div>
      </div>
    );
  }

  return <CareerNavigatorLoader />;
}
