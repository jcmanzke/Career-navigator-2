import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = (request: NextRequest) => {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createSupabaseClient(supabaseUrl!, supabaseKey!, {
    auth: {
      persistSession: true,
      storage: {
        getItem(key) {
          return request.cookies.get(key)?.value ?? null;
        },
        setItem(key, value) {
          request.cookies.set(key, value);
          response = NextResponse.next({ request });
          response.cookies.set(key, value);
        },
        removeItem(key) {
          request.cookies.set(key, "");
          response = NextResponse.next({ request });
          response.cookies.set(key, "", { maxAge: -1 });
        },
      },
    },
  });

  return { supabase, response };
};
