"use client";

import TopBar from "@/app/components/TopBar";

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar hideBackOn={["/start"]} />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
