import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type CookieStore = {
  get(name: string): { value: string | undefined } | undefined;
  set(name: string, value: string, options?: { maxAge?: number }): void;
};

export const createClient = (cookieStore: CookieStore) => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      storage: {
        getItem(key) {
          return cookieStore.get(key)?.value ?? null;
        },
        setItem(key, value) {
          cookieStore.set(key, value);
        },
        removeItem(key) {
          cookieStore.set(key, "", { maxAge: -1 });
        },
      },
    },
  });
};
