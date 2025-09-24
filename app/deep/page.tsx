"use client";

import LoginScreen from "@/app/components/LoginScreen";
import Sidebar from "@/app/components/Sidebar";
import CareerNavigatorLoader from "@/app/CareerNavigatorLoader";
import { useSupabaseSession } from "@/lib/useSupabaseSession";

export default function DeepPage() {
  const { session, loading, error } = useSupabaseSession();

  if (loading) return null;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-semantic-error-base">{error}</p>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <CareerNavigatorLoader />
      </div>
    </div>
  );
}
