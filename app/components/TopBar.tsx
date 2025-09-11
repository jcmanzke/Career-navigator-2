"use client";

import { usePathname, useRouter } from "next/navigation";

export default function TopBar({
  hideBackOn = [],
  right,
}: {
  hideBackOn?: string[];
  right?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const shouldHideBack = hideBackOn.includes(pathname || "");

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-neutrals-0/70 border-b border-accent-700 h-12 flex items-center">
      <div className="max-w-5xl mx-auto px-4 w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mobile menu toggle */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-full p-2 text-neutrals-900 hover:bg-primary-500/70 focus-visible:bg-primary-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
            aria-label="Toggle menu"
            onClick={() => {
              try {
                window.dispatchEvent(new CustomEvent("cn:toggleSidebar"));
              } catch {}
            }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"/></svg>
          </button>

          {/* Back button (hidden on specified routes) */}
          {!shouldHideBack && (
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-small text-neutrals-900 hover:bg-primary-500/70 focus-visible:bg-primary-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
              aria-label="Go back"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 7l-5 5 5 5V7z"/></svg>
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
        </div>
        <div className="flex-shrink min-w-0">{right}</div>
      </div>
    </header>
  );
}
