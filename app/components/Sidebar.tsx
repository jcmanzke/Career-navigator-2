"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const Icon = ({ path, label }: { path: string; label: string }) => (
  <svg aria-hidden="true" focusable="false" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d={path} />
    <title>{label}</title>
  </svg>
);

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const v = localStorage.getItem("cn_sidebar_collapsed");
      if (v === "1") setCollapsed(true);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("cn_sidebar_collapsed", collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);

  const supabase = createClient();

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    router.push("/login");
  };

  const itemBase =
    "w-full flex items-center gap-3 rounded-3xl px-3 py-2 text-neutrals-900 hover:bg-primary-500/70 focus-visible:bg-primary-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500";

  return (
    <aside className={`${collapsed ? "w-16" : "w-60"} shrink-0 border-r border-accent-700 bg-neutrals-50/70 backdrop-blur-md px-2 py-3 flex flex-col min-h-screen`}
      aria-label="Sidebar navigation">
      <div className="flex items-center justify-between px-1">
        {!collapsed && <span className="font-semibold text-neutrals-900">Menu</span>}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="rounded-full p-2 hover:bg-primary-500/70 focus-visible:bg-primary-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
        >
          <Icon label="Toggle" path="M4 12h16M4 6h16M4 18h16" />
        </button>
      </div>

      <nav className="mt-4 flex-1 space-y-1">
        <Link href="/start" className={itemBase} aria-label="Home">
          <Icon label="Home" path="M3 12l9-7 9 7v8a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-8z" />
          {!collapsed && <span>Home</span>}
        </Link>

        <button className={itemBase} aria-label="Ressources" type="button">
          <Icon label="Resources" path="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
          {!collapsed && <span>Ressources</span>}
        </button>

        <button className={itemBase} aria-label="Quick Test" type="button">
          <Icon label="Quick Test" path="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5h-2v6l5 3 .9-1.5-3.9-2.3V7z" />
          {!collapsed && <span>Quick Test</span>}
        </button>

        <button className={itemBase} aria-label="Help" type="button">
          <Icon label="Help" path="M12 2a10 10 0 100 20 10 10 0 000-20zm0 15a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0-2a1 1 0 01-1-1c0-2 3-2 3-5a3 3 0 10-6 0H6a6 6 0 1112 0c0 4-4 4-4 6a1 1 0 01-1 1z" />
          {!collapsed && <span>Help</span>}
        </button>
      </nav>

      <div className="mt-auto px-1">
        <button
          type="button"
          onClick={logout}
          className={itemBase + " w-full justify-start"}
          aria-label="Log out"
        >
          <Icon label="Logout" path="M16 17l1.41-1.41L14.83 13H21v-2h-6.17l2.58-2.59L16 7l-5 5 5 5zM3 19h8v-2H5V7h6V5H3v14z" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
