import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTask } from "../actions";
import { TASK_PRIORITY, TASK_STATUS, type Company, type Deal } from "@/lib/types";

const field =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const labelCls = "block text-sm font-medium text-slate-700";

type DealOption = Pick<Deal, "id" | "title"> & {
  companies: Pick<Company, "name"> | null;
};

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ deal_id?: string | string[]; next?: string | string[] }>;
}) {
  const { deal_id, next } = await searchParams;
  const presetDealId = typeof deal_id === "string" ? deal_id : "";
  const nextValue = typeof next === "string" ? next : Array.isArray(next) ? next[0] : "";
  const showNextBanner = nextValue === "1";

  const supabase = await createClient();
  const [{ data: companyData }, { data: dealData }] = await Promise.all([
    supabase.from("companies").select("id, name").order("name", { ascending: true }),
    supabase
      .from("deals")
      .select("*, companies ( name )")
      .order("created_at", { ascending: false }),
  ]);
  const companies = (companyData ?? []) as Pick<Company, "id" | "name">[];
  const deals = (dealData ?? []) as DealOption[];

  return (
    <div className="px-8 py-10">
      <div className="mb-6">
        <Link href="/tasks" className="text-sm text-slate-500 hover:text-slate-900">
          ← タスク一覧
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">タスクを新規登録</h1>
      </div>

      {showNextBanner && (
        <p className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          前のタスクが完了しました。次のアクションを設定してください。
        </p>
      )}

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
              期限{presetDealId && <span className="text-red-500"> *</span>}
            </label>
            <input
              id="due_date"
              name="due_date"
              type="date"
              required={Boolean(presetDealId)}
              className={field}
            />
          </div>
        </div>

        <div>
          <label htmlFor="deal_id" className={labelCls}>
            関連する案件{" "}
            <span className="font-normal text-slate-400">
              選択すると期限の入力が必須になります
            </span>
          </label>
          <select
            id="deal_id"
            name="deal_id"
            defaultValue={presetDealId}
            className={field}
          >
            <option value="">（なし）</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.companies?.name ? `${d.companies.name} / ${d.title}` : d.title}
              </option>
            ))}
          </select>
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
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-800"
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
