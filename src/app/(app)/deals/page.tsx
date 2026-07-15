import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  CLOSED_DEAL_STAGES,
  DEAL_CHANNEL,
  DEAL_STAGE,
  type Deal,
  type DealStage,
} from "@/lib/types";

const STAGE_STYLE: Record<string, string> = {
  list: "bg-slate-100 text-slate-600",
  selected: "bg-slate-200 text-slate-700",
  contacting: "bg-blue-100 text-blue-700",
  meeting_set: "bg-indigo-100 text-indigo-700",
  meeting_done: "bg-violet-100 text-violet-700",
  considering: "bg-amber-100 text-amber-700",
  contract: "bg-green-100 text-green-700",
  live: "bg-emerald-100 text-emerald-700",
  nurturing: "bg-teal-100 text-teal-700",
  lost: "bg-red-100 text-red-600",
};

type DealWithCompany = Deal & { companies: { name: string } | null };

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string | string[] }>;
}) {
  const { stage } = await searchParams;
  // 不正な値は無視して「すべて」扱いにする
  const stageFilter =
    typeof stage === "string" && stage in DEAL_STAGE
      ? (stage as DealStage)
      : null;

  const supabase = await createClient();
  let query = supabase
    .from("deals")
    .select("*, companies ( name )")
    .order("created_at", { ascending: false });
  if (stageFilter) {
    query = query.eq("stage", stageFilter);
  }
  const { data, error } = await query;

  const deals = (data ?? []) as DealWithCompany[];

  // 次アクション未設定のアクティブ案件を検出する軽量クエリ（1クエリで済む範囲）:
  // deal_id を持つ未完了タスクの deal_id 一覧だけを取得し、Set 突合で判定する
  const { data: openDealTaskData } = await supabase
    .from("tasks")
    .select("deal_id")
    .not("deal_id", "is", null)
    .neq("status", "done");
  const dealsWithOpenTask = new Set(
    (openDealTaskData ?? []).map((t) => t.deal_id as string),
  );

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">案件</h1>
          <p className="mt-1 text-sm text-slate-500">{deals.length} 件</p>
        </div>
        <Link
          href="/deals/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          + 案件を追加
        </Link>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          読み込みエラー: {error.message}（マイグレーション未実行の可能性があります）
        </p>
      )}

      <form method="get" className="mb-4 flex items-center gap-3">
        <label htmlFor="stage" className="text-sm font-medium text-slate-700">
          ステージ
        </label>
        <select
          id="stage"
          name="stage"
          defaultValue={stageFilter ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
        >
          <option value="">すべて</option>
          {Object.entries(DEAL_STAGE).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          絞り込む
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {deals.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-5 py-3 font-medium">案件名</th>
                <th className="px-5 py-3 font-medium">取引先</th>
                <th className="px-5 py-3 font-medium">ステージ</th>
                <th className="px-5 py-3 font-medium">チャネル</th>
                <th className="px-5 py-3 font-medium">更新日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deals.map((d) => (
                <tr key={d.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/deals/${d.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {d.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {d.companies?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          STAGE_STYLE[d.stage]
                        }`}
                      >
                        {DEAL_STAGE[d.stage]}
                      </span>
                      {!CLOSED_DEAL_STAGES.includes(d.stage) &&
                        !dealsWithOpenTask.has(d.id) && (
                          <span className="whitespace-nowrap rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            次アクション未設定
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {DEAL_CHANNEL[d.channel]}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {d.updated_at.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            {stageFilter
              ? "このステージの案件はありません。"
              : "まだ案件がありません。「案件を追加」から登録してください。"}
          </p>
        )}
      </div>
    </div>
  );
}
