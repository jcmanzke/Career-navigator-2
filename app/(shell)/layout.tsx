"use client";

import Sidebar from "@/app/components/Sidebar";
import { useRouter } from "next/navigation";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
