"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

interface UseSupabaseSessionResult {
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export function useSupabaseSession(): UseSupabaseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const supabase = createClient();
      supabase.auth
        .getSession()
        .then(({ data, error }) => {
          if (error) {
            setError(error.message);
            setSession(null);
          } else {
            setSession(data.session);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError((err as Error).message);
          setLoading(false);
        });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
      setLoading(false);
    }

    return unsubscribe;
  }, []);

  return { session, loading, error };
}
