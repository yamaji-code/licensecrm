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
      <aside className="flex w-56 shrink-0 flex-col bg-blue-900">
        <div className="border-b border-blue-800 px-5 py-4">
          <p className="text-sm font-semibold text-white">License CRM</p>
          <p className="mt-0.5 text-xs text-blue-300">社内業務ツール</p>
        </div>

        <Nav />

        <div className="border-t border-blue-800 px-5 py-4">
          <p className="truncate text-xs text-blue-300" title={user.email ?? ""}>
            {user.email}
          </p>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="mt-2 text-xs text-blue-200 underline underline-offset-2 transition hover:text-white"
            >
              ログアウト
            </button>
          </form>
        </div>
      </aside>

      {/* min-w-0 = ボードの横スクロールがサイドバーを押し出さないための保険 */}
      <main className="min-w-0 flex-1 overflow-y-auto bg-slate-50">
        {children}
      </main>
    </div>
  );
}
