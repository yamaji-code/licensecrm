"use client";

// ログインはマジックリンク方式。Server Action ではなくクライアント側で
// supabase.auth.signInWithOtp を叩くため、送信中の状態は useState で持つ
// （useFormStatus は親フォームの action を前提にするので SubmitButton は使えない）。
import Image from "next/image";
import { use, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Banner, Button, Card, CardBody, Field, Input } from "@/components/ui";

// ?error= の文言。/auth/callback から弾かれたときにここへ戻される
function errorMessage(error: string | undefined): string {
  if (error === "forbidden") {
    return "このメールアドレスはログインを許可されていません。";
  }
  return "ログインに失敗しました。もう一度お試しください。";
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  // URLの ?error= は描画時に確定している値なので、effect で後から setState せず
  // そのまま初期値に使う（effect で入れると一瞬エラー無しの画面が挟まる）
  const { error: errorParam } = use(searchParams);
  const initialError = typeof errorParam === "string" ? errorParam : undefined;

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    initialError ? "error" : "idle",
  );
  const [message, setMessage] = useState(
    initialError ? errorMessage(initialError) : "",
  );

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

  const sending = status === "sending";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardBody className="p-6 sm:p-8">
            <Image
              src="/brand/logo.svg"
              alt="XKitchen"
              width={223}
              height={36}
              priority
              unoptimized
              className="h-7 w-auto"
            />
            <h1 className="mt-4 text-xl font-medium text-ink">License CRM</h1>
            <p className="mt-1 text-sm text-ink-soft">社内メンバー用ログイン</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Field htmlFor="email" label="メールアドレス" required>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@x-kitchen.jp"
                />
              </Field>

              <Button
                type="submit"
                variant="primary"
                disabled={sending || status === "sent"}
                aria-busy={sending}
                className="w-full"
              >
                {sending ? "送信中…" : "ログインリンクを送信"}
              </Button>
            </form>

            {message && (
              <div className="mt-4">
                <Banner tone={status === "error" ? "danger" : "ok"}>
                  {message}
                </Banner>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
