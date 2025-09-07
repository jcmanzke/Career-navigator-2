import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

(async () => {
  try {
    const { data, error } = await supabase.from('journeys').select('id').limit(1);
    if (error) {
      console.error('Supabase error:', error.message);
      process.exit(1);
    }
    console.log('Connected to Supabase. Sample:', data);
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
})();
