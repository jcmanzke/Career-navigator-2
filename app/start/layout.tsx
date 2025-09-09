"use client";

import Sidebar from "@/app/components/Sidebar";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function StartLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const showBack = pathname !== "/start";
  const supabase = createClient();
  const logout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    if (typeof window !== 'undefined') window.location.replace('/login');
  };
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0">
        {/* Top white banner with optional Back and Logout */}
        <div className="sticky top-0 z-20 backdrop-blur bg-neutrals-0/70 border-b border-accent-700 h-12 flex items-center justify-between">
          <div className="px-4">
            {showBack && (
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-small text-neutrals-900 hover:bg-primary-500/70 focus-visible:bg-primary-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
                aria-label="Go back"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 7l-5 5 5 5V7z"/></svg>
                Back
              </button>
            )}
          </div>
          <div className="px-4">
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-small text-neutrals-900 hover:bg-primary-500/70 focus-visible:bg-primary-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
              aria-label="Log out"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 17l1.41-1.41L14.83 13H21v-2h-6.17l2.58-2.59L16 7l-5 5 5 5zM3 19h8v-2H5V7h6V5H3v14z"/></svg>
              Logout
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
