import { TASK_PRIORITY_STYLE, TASK_STATUS_STYLE } from "@/components/badges";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  TASK_PRIORITY,
  TASK_STATUS,
  type Task,
} from "@/lib/types";
import { toggleTaskDone } from "./actions";

type TaskWithCompany = Task & { companies: { name: string } | null };

export default async function TasksPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, companies ( name )")
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false });

  const tasks = (data ?? []) as TaskWithCompany[];

  async function markDone(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const done = formData.get("done") === "true";
    await toggleTaskDone(id, done);
  }

  return (
    <div className="px-8 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">タスク</h1>
          <p className="mt-1 text-sm text-slate-500">{tasks.length} 件</p>
        </div>
        <Link
          href="/tasks/new"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-800"
        >
          + 新規登録
        </Link>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          読み込みエラー: {error.message}（マイグレーション未実行の可能性があります）
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {tasks.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                <form action={markDone}>
                  <input type="hidden" name="id" value={t.id} />
                  <input
                    type="hidden"
                    name="done"
                    value={t.status === "done" ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    aria-label={t.status === "done" ? "未完了に戻す" : "完了にする"}
                    className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                      t.status === "done"
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-slate-300 text-transparent hover:border-slate-500"
                    }`}
                  >
                    ✓
                  </button>
                </form>

                <div className="min-w-0 flex-1">
                  <p
                    className={`font-medium ${
                      t.status === "done"
                        ? "text-slate-400 line-through"
                        : "text-slate-900"
                    }`}
                  >
                    {t.title}
                  </p>
                  {t.companies?.name && (
                    <p className="text-xs text-slate-400">{t.companies.name}</p>
                  )}
                </div>

                <span className={`text-xs font-medium ${TASK_PRIORITY_STYLE[t.priority]}`}>
                  {TASK_PRIORITY[t.priority]}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    TASK_STATUS_STYLE[t.status]
                  }`}
                >
                  {TASK_STATUS[t.status]}
                </span>
                <span className="w-24 text-right text-xs text-slate-400">
                  {t.due_date ?? "期限なし"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            まだタスクがありません。「新規登録」から追加してください。
          </p>
        )}
      </div>
    </div>
  );
}
