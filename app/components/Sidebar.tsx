"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const Icon = ({ path, label, stroke = false }: { path: string; label: string; stroke?: boolean }) => (
  <svg
    aria-hidden="true"
    focusable="false"
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill={stroke ? "none" : "currentColor"}
    stroke={stroke ? "currentColor" : "none"}
    strokeWidth={stroke ? 2 : undefined}
    strokeLinecap={stroke ? "round" : undefined}
    strokeLinejoin={stroke ? "round" : undefined}
  >
    <path d={path} />
    <title>{label}</title>
  </svg>
);

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  // Persist collapsed state (desktop only)
  useEffect(() => {
    try {
      const v = localStorage.getItem("cn_sidebar_collapsed");
      if (v === "1") setCollapsed(true);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("cn_sidebar_collapsed", collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);

  // Listen for global menu toggle events from TopBar (mobile)
  useEffect(() => {
    const handler = () => setMobileOpen((v) => !v);
    try {
      window.addEventListener("cn:toggleSidebar" as any, handler as any);
    } catch {}
    return () => {
      try { window.removeEventListener("cn:toggleSidebar" as any, handler as any); } catch {}
    };
  }, []);

  const supabase = createClient();
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? null)).catch(() => {});
  }, []);

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    // Hard navigation to avoid shell/sidebar flicker
    if (typeof window !== 'undefined') window.location.replace('/login');
  };

  const itemBase =
    "w-full flex items-center gap-3 rounded-3xl px-3 py-2 text-neutrals-900 hover:bg-primary-500/70 focus-visible:bg-primary-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500";

  return (
    <>
      {/* Backdrop for mobile */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-neutrals-900/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        aria-label="Sidebar navigation"
        className={
          `${collapsed ? "md:w-16" : "md:w-60"} ` +
          `shrink-0 border-r border-accent-700 bg-neutrals-50/70 backdrop-blur-md px-2 py-3 flex flex-col min-h-screen overflow-y-auto ` +
          // Mobile off-canvas behavior
          `fixed inset-y-0 left-0 z-50 w-64 transform transition-transform md:static md:translate-x-0 ` +
          (mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")
        }
        role="navigation"
      >
        <div className="flex items-center justify-between px-1">
          {/* Title */}
          <span className={`${mobileOpen ? 'inline' : 'hidden'} md:inline font-semibold text-neutrals-900`}>Menu</span>
          {/* Collapse toggle (desktop) and Close (mobile) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              className="hidden md:inline-flex rounded-full p-2 hover:bg-primary-500/70 focus-visible:bg-primary-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 text-neutrals-900"
            >
              <Icon label="Toggle" path="M4 12h16M4 6h16M4 18h16" stroke />
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="md:hidden inline-flex rounded-full p-2 hover:bg-primary-500/70 focus-visible:bg-primary-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 text-neutrals-900"
              aria-label="Close menu"
            >
              <Icon label="Close" path="M6 18L18 6M6 6l12 12" stroke />
            </button>
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-1">
          <Link href="/start" className={itemBase} aria-label="Home" onClick={() => setMobileOpen(false)}>
            <Icon label="Home" path="M3 12l9-7 9 7v8a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-8z" />
            <span className={`${mobileOpen ? 'inline' : 'hidden'} md:inline`}>Home</span>
          </Link>

          <button className={itemBase} aria-label="Ressources" type="button" onClick={() => setMobileOpen(false)}>
            <Icon label="Resources" path="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
            <span className={`${mobileOpen ? 'inline' : 'hidden'} md:inline`}>Ressources</span>
          </button>

          <button className={itemBase} aria-label="Quick Test" type="button" onClick={() => setMobileOpen(false)}>
            <Icon label="Quick Test" path="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5h-2v6l5 3 .9-1.5-3.9-2.3V7z" />
            <span className={`${mobileOpen ? 'inline' : 'hidden'} md:inline`}>Quick Test</span>
          </button>

          <button className={itemBase} aria-label="Help" type="button" onClick={() => setMobileOpen(false)}>
            <Icon label="Help" path="M12 2a10 10 0 100 20 10 10 0 000-20zm0 15a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0-2a1 1 0 01-1-1c0-2 3-2 3-5a3 3 0 10-6 0H6a6 6 0 1112 0c0 4-4 4-4 6a1 1 0 01-1 1z" />
            <span className={`${mobileOpen ? 'inline' : 'hidden'} md:inline`}>Help</span>
          </button>
        </nav>

        <div className="mt-auto px-1">
          {email && (
            <div className="mb-2 px-3 py-1 text-small text-neutrals-600 truncate" aria-label="User email">{email}</div>
          )}
          <button
            type="button"
            onClick={logout}
            className={itemBase + " w-full justify-start"}
            aria-label="Log out"
          >
            <Icon label="Logout" path="M16 17l1.41-1.41L14.83 13H21v-2h-6.17l2.58-2.59L16 7l-5 5 5 5zM3 19h8v-2H5V7h6V5H3v14z" />
            <span className={`${mobileOpen ? 'inline' : 'hidden'} md:inline`}>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
