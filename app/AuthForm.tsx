"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type AuthMode = "login" | "signup";

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits");
      return;
    }
    try {
      const supabase = createClient();
      const normalizedEmail = email.trim().toLowerCase();
      const supabasePassword = pin.padEnd(6, "0");
      const { error } =
        mode === "signup"
          ? await supabase.auth.signUp({
              email: normalizedEmail,
              password: supabasePassword,
            })
          : await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: supabasePassword,
            });
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-xs text-left">
      <label className="text-small text-neutrals-600 mt-8 mb-1 block">eMail</label>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="h-12 px-4 rounded-2xl border border-accent-700"
      />

      <label className="text-small text-neutrals-600 mt-8 mb-1 block">Pin</label>
      <div className="relative">
        <input
          type={showPin ? "text" : "password"}
          placeholder="4-digit PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          required
          maxLength={4}
          inputMode="numeric"
          title="PIN must be exactly 4 digits"
          className="h-12 w-full pr-10 px-4 rounded-2xl border border-accent-700"
        />
        <button
          type="button"
          aria-label={showPin ? "Hide PIN" : "Show PIN"}
          onClick={() => setShowPin((v) => !v)}
          className="absolute inset-y-0 right-2 my-auto h-8 w-8 flex items-center justify-center text-neutrals-600"
        >
          {/* Simple eye icon using SVG to avoid extra deps */}
          {showPin ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M3 3l18 18" />
              <path d="M10.58 10.58a2 2 0 102.83 2.83" />
              <path d="M9.88 5.09A9.77 9.77 0 0121 12s-2.73 5-9 5a9.77 9.77 0 01-3.12-.5" />
              <path d="M6.18 6.18A9.77 9.77 0 003 12s2.73 5 9 5c1.27 0 2.45-.2 3.54-.56" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {error && <p className="text-semantic-error-base text-small">{error}</p>}
      <button type="submit" className="bg-primary-500 text-[#2C2C2C] h-12 px-4 rounded-3xl font-semibold uppercase">
        {mode === "signup" ? "Sign Up" : "Log In"}
      </button>
    </form>
  );
}
