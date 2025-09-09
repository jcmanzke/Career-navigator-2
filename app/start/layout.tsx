"use client";

import Sidebar from "@/app/components/Sidebar";
import { useRouter, usePathname } from "next/navigation";

export default function StartLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const showBack = pathname !== "/start";
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0">
        {/* Top white banner with optional Back */}
        <div className="sticky top-0 z-20 backdrop-blur bg-neutrals-0/70 border-b border-accent-700 h-12 flex items-center">
          {showBack && (
            <div className="px-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-small text-neutrals-900 hover:bg-primary-500/70 focus-visible:bg-primary-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
                aria-label="Go back"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 7l-5 5 5 5V7z"/></svg>
                Back
              </button>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
