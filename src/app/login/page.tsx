"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error === "forbidden") {
      setStatus("error");
      setMessage("このメールアドレスはログインを許可されていません。");
    } else if (error) {
      setStatus("error");
      setMessage("ログインに失敗しました。もう一度お試しください。");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      setStatus("sent");
      setMessage("ログイン用リンクをメールで送信しました。メールをご確認ください。");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "予期しないエラーが発生しました。",
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Image
          src="/brand/logo.svg"
          alt="XKitchen"
          width={223}
          height={36}
          priority
          unoptimized
          className="h-7 w-auto"
        />
        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          License CRM
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          社内メンバー用ログイン
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@x-kitchen.jp"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={status === "sending" || status === "sent"}
            className="w-full rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-800 disabled:opacity-50"
          >
            {status === "sending" ? "送信中…" : "ログインリンクを送信"}
          </button>
        </form>

        {message && (
          <p
            className={`mt-4 text-sm ${
              status === "error" ? "text-red-600" : "text-green-700"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
