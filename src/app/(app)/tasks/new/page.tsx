import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTask } from "../actions";
import { TASK_PRIORITY, TASK_STATUS, type Company } from "@/lib/types";

const field =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500";
const labelCls = "block text-sm font-medium text-slate-700";

export default async function NewTaskPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("id, name")
    .order("name", { ascending: true });
  const companies = (data ?? []) as Pick<Company, "id" | "name">[];

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <div className="mb-6">
        <Link href="/tasks" className="text-sm text-slate-500 hover:text-slate-900">
          ← タスク一覧
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">タスクを新規登録</h1>
      </div>

      <form
        action={createTask}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div>
          <label htmlFor="title" className={labelCls}>
            タイトル <span className="text-red-500">*</span>
          </label>
          <input id="title" name="title" required className={field} />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="status" className={labelCls}>
              ステータス
            </label>
            <select id="status" name="status" defaultValue="todo" className={field}>
              {Object.entries(TASK_STATUS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="priority" className={labelCls}>
              優先度
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue="medium"
              className={field}
            >
              {Object.entries(TASK_PRIORITY).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="due_date" className={labelCls}>
              期限
            </label>
            <input id="due_date" name="due_date" type="date" className={field} />
          </div>
        </div>

        <div>
          <label htmlFor="company_id" className={labelCls}>
            関連する取引先
          </label>
          <select id="company_id" name="company_id" defaultValue="" className={field}>
            <option value="">（なし）</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="note" className={labelCls}>
            メモ
          </label>
          <textarea id="note" name="note" rows={3} className={field} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            登録する
          </button>
          <Link href="/tasks" className="text-sm text-slate-500 hover:text-slate-900">
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
