"use client";

import Sidebar from "@/app/components/Sidebar";
import { useRouter } from "next/navigation";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0">
        {/* Back button visible on all pages using this shell */}
        <div className="px-4 pt-3">
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
        {children}
      </div>
    </div>
  );
}

