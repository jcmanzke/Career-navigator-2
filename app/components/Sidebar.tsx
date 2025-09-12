"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { navItems } from "./navItems";

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

  // Show item labels when the sidebar is expanded or when the mobile
  // menu is open. Tailwind needs concrete class strings (md:hidden /
  // md:inline) so we build them explicitly instead of using a dynamic
  // template that JIT might not detect, which previously caused labels
  // and the logout text to disappear on some pages.
  const labelCls = (collapsed: boolean, mobileOpen: boolean) =>
    `${mobileOpen ? 'inline' : 'hidden'} ${collapsed ? 'md:hidden' : 'md:inline'}`;

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
          <span className={`${mobileOpen ? 'inline' : 'hidden'} ${collapsed ? 'md:hidden' : 'md:inline'} font-semibold text-neutrals-900`}>Menu</span>
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
          {navItems.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className={itemBase}
                aria-label={item.label}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
              >
                <Icon label={item.label} path={item.iconPath} stroke />
                <span className={labelCls(collapsed, mobileOpen)}>{item.label}</span>
              </Link>
            ) : (
              <button
                key={item.label}
                className={itemBase}
                aria-label={item.label}
                type="button"
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
              >
                <Icon label={item.label} path={item.iconPath} stroke />
                <span className={labelCls(collapsed, mobileOpen)}>{item.label}</span>
              </button>
            )
          )}
        </nav>

        <div className="mt-auto px-1 pb-1">
          {email && (
            <div
              className={
                "mb-2 px-3 py-1 text-small text-neutrals-600 truncate" +
                (collapsed ? " hidden" : "")
              }
              aria-label="User email"
            >
              {email}
            </div>
          )}
          {email ? (
            <button
              type="button"
              onClick={logout}
              className={itemBase + " w-full justify-start"}
              aria-label="Log out"
              title={collapsed ? 'Log out' : undefined}
            >
              {/* Stroke-friendly logout icon (arrow out of a rectangle) */}
              <Icon
                label="Logout"
                path="M17 8l4 4-4 4M21 12H10M4 4h7a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z"
                stroke
              />
              <span className={labelCls(collapsed, mobileOpen)}>Log out</span>
            </button>
          ) : (
            <Link
              href="/login"
              className={itemBase + " w-full justify-start"}
              aria-label="Log in"
              title={collapsed ? 'Log in' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              {/* Login icon: arrow into a rectangle */}
              <Icon
                label="Login"
                path="M7 8l-4 4 4 4M3 12h12M13 4h7a2 2 0 012 2v12a2 2 0 01-2 2h-7a2 2 0 01-2-2V6a2 2 0 012-2z"
                stroke
              />
              <span className={labelCls(collapsed, mobileOpen)}>Log in</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
