"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../lib/supabaseClient";

type AuthMode = "login" | "signup";

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits");
      return;
    }
    try {
      const supabase = getSupabaseClient();
      const authFn =
        mode === "signup"
          ? supabase.auth.signUp
          : supabase.auth.signInWithPassword;
      const { error } = await authFn({ email, password: pin });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-xs">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="border p-2"
      />
      <input
        type="password"
        placeholder="4-digit PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        required
        maxLength={4}
        inputMode="numeric"
        title="PIN must be exactly 4 digits"
        className="border p-2"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-blue-600 text-white p-2">
        {mode === "signup" ? "Sign Up" : "Log In"}
      </button>
    </form>
  );
}
