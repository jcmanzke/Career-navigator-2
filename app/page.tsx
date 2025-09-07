"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import CareerNavigatorLoader from "./CareerNavigatorLoader";
import AuthForm from "./AuthForm";
import { createClient } from "@/utils/supabase/client";

export default function Page() {
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

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <AuthForm mode={authMode} />
          <button
            onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
            className="text-small text-primary-500 underline"
          >
            {authMode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
          </button>
        </div>
      </div>
    );
  }

  return <CareerNavigatorLoader />;
}
