"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DeepAnalysisRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/deep");
  }, [router]);

  return null;
}
