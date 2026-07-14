import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ（クライアントコンポーネント）用の Supabase クライアント。
 * NEXT_PUBLIC_ の環境変数のみ参照する（秘密情報は含めない）。
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase の環境変数が未設定です。.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。",
    );
  }

  return createBrowserClient(url, anonKey);
}
