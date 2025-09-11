"use client";

import Sidebar from "@/app/components/Sidebar";
import TopBar from "@/app/components/TopBar";
import LogoutButton from "@/app/components/LogoutButton";

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <TopBar hideBackOn={["/start"]} right={<LogoutButton />} />
        {children}
      </div>
    </div>
  );
}
