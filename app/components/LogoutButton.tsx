"use client";

import { createClient } from "@/utils/supabase/client";

export default function LogoutButton() {
  const supabase = createClient();
  const logout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    if (typeof window !== 'undefined') window.location.replace('/login');
  };
  return (
    <button
      type="button"
      onClick={logout}
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-small text-neutrals-900 hover:bg-primary-500/70 focus-visible:bg-primary-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
      aria-label="Log out"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 17l1.41-1.41L14.83 13H21v-2h-6.17l2.58-2.59L16 7l-5 5 5 5zM3 19h8v-2H5V7h6V5H3v14z"/></svg>
      <span className="hidden sm:inline">Logout</span>
    </button>
  );
}

