import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error('Missing Supabase URL or service role key.');
    }
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      throw new Error('Invalid Supabase URL. Check NEXT_PUBLIC_SUPABASE_URL.');
    }
    adminClient = createClient(url, serviceKey);
  }
  return adminClient;
}
