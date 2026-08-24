"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const sb = supabase();
    if (mode === "signin") {
      const { error: err } = await sb.auth.signInWithPassword({
        email,
        password,
      });
      setBusy(false);
      if (err) {
        setError(err.message);
        return;
      }
      router.replace(params.get("next") ?? "/");
    } else {
      const { data, error: err } = await sb.auth.signUp({ email, password });
      setBusy(false);
      if (err) {
        setError(
          err.message.toLowerCase().includes("database error")
            ? "Access restricted — this app is limited to VMP operators."
            : err.message
        );
        return;
      }
      if (data.session) {
        router.replace(params.get("next") ?? "/");
      } else {
        setNotice("Account created — sign in with the same email and password.");
        setMode("signin");
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6">
      <Image
        src="/brand/logo-stacked-light.png"
        alt="Vision Maker Productions"
        width={200}
        height={150}
        priority
        className="mb-8"
      />
      <form onSubmit={submit} className="w-full max-w-sm space-y-3">
        <h1 className="text-center text-xl text-paper">
          {mode === "signin" ? "Gear Inventory" : "Create Operator Account"}
        </h1>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-n600 bg-n800 px-4 py-3 text-paper placeholder-n400"
          autoComplete="email"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-n600 bg-n800 px-4 py-3 text-paper placeholder-n400"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />
        {error && (
          <p className="rounded-lg bg-error/20 p-3 text-sm text-paper">{error}</p>
        )}
        {notice && (
          <p className="rounded-lg bg-success/20 p-3 text-sm text-paper">
            {notice}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-gold px-4 py-3 font-semibold text-ink disabled:opacity-60"
        >
          {busy ? "…" : mode === "signin" ? "Sign In" : "Create Account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="w-full text-center text-sm text-n400 underline"
        >
          {mode === "signin"
            ? "First time? Create your operator account"
            : "Already set up? Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
