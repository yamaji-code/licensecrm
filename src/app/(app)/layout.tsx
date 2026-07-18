import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Nav from "./nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy でガード済みだが、二重で保険をかける
  if (!user) {
    redirect("/login");
  }

  return (
    // 画面高さに固定し、はみ出しは各領域の内側でスクロールさせる
    // （サイドバーと各ページのヘッダーを固定するための土台）
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 shrink-0 flex-col bg-brand-700">
        <div className="border-b border-brand-600 px-5 py-5">
          <Image
            src="/brand/logo-white.svg"
            alt="XKitchen"
            width={223}
            height={36}
            priority
            unoptimized
            className="h-6 w-auto"
          />
          <p className="mt-2 text-xs text-brand-200">ライセンス営業 CRM</p>
        </div>

        <Nav />

        <div className="border-t border-brand-600 px-5 py-4">
          <p className="truncate text-xs text-brand-200" title={user.email ?? ""}>
            {user.email}
          </p>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="mt-2 text-xs text-brand-200 underline underline-offset-2 transition hover:text-white"
            >
              ログアウト
            </button>
          </form>
        </div>
      </aside>

      {/* min-w-0 = ボードの横スクロールがサイドバーを押し出さないための保険 */}
      <main className="min-w-0 flex-1 overflow-y-auto bg-surface">
        {children}
      </main>
    </div>
  );
}
