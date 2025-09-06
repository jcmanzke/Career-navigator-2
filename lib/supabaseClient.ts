import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error('Missing Supabase URL or anon key. Check your environment variables.');
    }
   // Validate URL format to provide clearer errors when variables are swapped
    try {
      // Throws if url is not a valid URL (e.g. the anon key by mistake)
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      if (/^https?:\/\//i.test(anonKey)) {
        throw new Error(
          'Invalid Supabase URL. It looks like the URL and anon key might be swapped.'
        );
      }
      throw new Error('Invalid Supabase URL. Check NEXT_PUBLIC_SUPABASE_URL.');
    }
    client = createClient(url, anonKey);
  }
  return client;
}
