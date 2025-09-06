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
      const password = pin.padEnd(6, "0");
      if (mode === "signup") {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Failed to sign up");
          return;
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
          return;
        }
      }
      router.push("/");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className={`p-3 rounded border ${
          mode === "login"
            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-300"
            : "border-gray-300"
        }`}
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
        className={`p-3 rounded border ${
          mode === "login"
            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-300"
            : "border-gray-300"
        }`}
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        className={`${
          mode === "signup"
            ? "bg-green-600 hover:bg-green-500"
            : "bg-indigo-500 hover:bg-indigo-400"
        } text-white p-3 rounded transition-colors`}
      >
        {mode === "signup" ? "Sign Up" : "Log In"}
      </button>
    </form>
  );
}
