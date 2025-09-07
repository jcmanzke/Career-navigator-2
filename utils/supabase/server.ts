import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = (cookieStore: Cookies) => {
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
