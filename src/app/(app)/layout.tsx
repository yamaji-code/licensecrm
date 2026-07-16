import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/", label: "ダッシュボード" },
  { href: "/deals", label: "案件" },
  { href: "/companies", label: "取引先・顧客" },
  { href: "/partners", label: "パートナー" },
  { href: "/tasks", label: "タスク" },
] as const;

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
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-sm font-semibold text-slate-900">License CRM</p>
          <p className="mt-0.5 text-xs text-slate-400">社内業務ツール</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4">
          <p className="truncate text-xs text-slate-500" title={user.email ?? ""}>
            {user.email}
          </p>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="mt-2 text-xs text-slate-500 underline underline-offset-2 transition hover:text-slate-900"
            >
              ログアウト
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 bg-slate-50">{children}</main>
    </div>
  );
}
