"use client";

import CareerNavigatorLoader from "@/app/CareerNavigatorLoader";
import { useSupabaseSession } from "@/lib/useSupabaseSession";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DeepPage() {
  const { session, loading, error } = useSupabaseSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session && !error) {
      router.replace("/login");
    }
  }, [loading, session, error, router]);

  if (loading) return null;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-semantic-error-base">{error}</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <CareerNavigatorLoader />;
}
