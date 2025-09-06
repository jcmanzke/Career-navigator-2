import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
