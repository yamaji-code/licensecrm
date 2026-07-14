import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TASK_STATUS } from "@/lib/types";

export default async function Dashboard() {
  const supabase = await createClient();

  const [{ count: companyCount }, { count: taskOpenCount }, { data: recentTasks }] =
    await Promise.all([
      supabase.from("companies").select("*", { count: "exact", head: true }),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .neq("status", "done"),
      supabase
        .from("tasks")
        .select("id, title, status, due_date")
        .neq("status", "done")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5),
    ]);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">ダッシュボード</h1>
        <p className="mt-1 text-sm text-slate-500">社内業務の概況</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/companies"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-400"
        >
          <p className="text-sm text-slate-500">取引先・顧客</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {companyCount ?? 0}
            <span className="ml-1 text-base font-normal text-slate-400">社</span>
          </p>
        </Link>
        <Link
          href="/tasks"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-400"
        >
          <p className="text-sm text-slate-500">未完了タスク</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {taskOpenCount ?? 0}
            <span className="ml-1 text-base font-normal text-slate-400">件</span>
          </p>
        </Link>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700">期限が近いタスク</h2>
          <Link href="/tasks" className="text-xs text-slate-500 hover:text-slate-900">
            すべて見る →
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {recentTasks && recentTasks.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {recentTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <span className="text-slate-800">{t.title}</span>
                  <span className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{TASK_STATUS[t.status as keyof typeof TASK_STATUS]}</span>
                    <span>{t.due_date ?? "期限なし"}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-center text-sm text-slate-400">
              未完了のタスクはありません
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
