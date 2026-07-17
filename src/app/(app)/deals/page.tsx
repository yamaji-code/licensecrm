import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  CLOSED_DEAL_STAGES,
  DEAL_CHANNEL,
  DEAL_STAGE,
  DEAL_STAGE_ORDER,
  type Deal,
  type DealStage,
} from "@/lib/types";
import { advanceDealStage } from "./actions";

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

// カンバンの列: パイプライン順（list→…→live）の後に、進行外の nurturing / lost を置く。
const BOARD_COLUMNS: DealStage[] = [
  ...DEAL_STAGE_ORDER,
  "nurturing",
  "lost",
];

type DealWithCompany = Deal & { companies: { name: string } | null };

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string | string[]; view?: string }>;
}) {
  const { stage, view } = await searchParams;
  // 表示モード: 既定はボード。table を指定したときだけ表形式。
  const isTable = view === "table";
  // 不正な値は無視して「すべて」扱いにする（表形式の絞り込み用）
  const stageFilter =
    typeof stage === "string" && stage in DEAL_STAGE
      ? (stage as DealStage)
      : null;

  const supabase = await createClient();
  let query = supabase
    .from("deals")
    .select("*, companies ( name )")
    .order("created_at", { ascending: false });
  // 表形式のときだけステージ絞り込みを適用する（ボードは全件を列に分ける）
  if (isTable && stageFilter) {
    query = query.eq("stage", stageFilter);
  }
  const { data, error } = await query;

  const deals = (data ?? []) as DealWithCompany[];

  // 案件ごとのタスク集計（全体件数 / 未完了件数）を 1 クエリで取得する。
  // 全完了（total>0 かつ open===0）= 次ステージへ進める、total===0 = 次アクション未設定。
  const { data: taskData } = await supabase
    .from("tasks")
    .select("deal_id, status")
    .not("deal_id", "is", null);
  const totalByDeal = new Map<string, number>();
  const openByDeal = new Map<string, number>();
  for (const t of taskData ?? []) {
    const id = t.deal_id as string;
    totalByDeal.set(id, (totalByDeal.get(id) ?? 0) + 1);
    if (t.status !== "done") {
      openByDeal.set(id, (openByDeal.get(id) ?? 0) + 1);
    }
  }

  return (
    <div className={isTable ? "mx-auto max-w-5xl px-8 py-10" : "px-6 py-10"}>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">案件</h1>
          <p className="mt-1 text-sm text-slate-500">{deals.length} 件</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 表示モード切替（ボード / 一覧） */}
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
            <Link
              href="/deals"
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                isTable
                  ? "text-slate-600 hover:bg-slate-100"
                  : "bg-slate-900 text-white"
              }`}
            >
              ボード
            </Link>
            <Link
              href="/deals?view=table"
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                isTable
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              一覧
            </Link>
          </div>
          <Link
            href="/deals/new"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            + 案件を追加
          </Link>
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          読み込みエラー: {error.message}（マイグレーション未実行の可能性があります）
        </p>
      )}

      {isTable ? (
        <TableView
          deals={deals}
          stageFilter={stageFilter}
          openByDeal={openByDeal}
        />
      ) : (
        <BoardView
          deals={deals}
          totalByDeal={totalByDeal}
          openByDeal={openByDeal}
        />
      )}
    </div>
  );
}

// ───────── ボード表示 ─────────

function BoardView({
  deals,
  totalByDeal,
  openByDeal,
}: {
  deals: DealWithCompany[];
  totalByDeal: Map<string, number>;
  openByDeal: Map<string, number>;
}) {
  const byStage = new Map<DealStage, DealWithCompany[]>();
  for (const col of BOARD_COLUMNS) byStage.set(col, []);
  for (const d of deals) {
    // 想定外のステージ値は表示から漏らさないよう、末尾 lost 側には入れず無視せず
    // 既知列にあるものだけ振り分ける（列外の値は現状データに無い）
    byStage.get(d.stage)?.push(d);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {BOARD_COLUMNS.map((col) => {
        const items = byStage.get(col) ?? [];
        return (
          <section
            key={col}
            className="flex w-72 shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-50"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_STYLE[col]}`}
              >
                {DEAL_STAGE[col]}
              </span>
              <span className="text-xs font-medium text-slate-400">
                {items.length}
              </span>
            </div>
            <div className="flex max-h-[calc(100vh-220px)] flex-col gap-2 overflow-y-auto p-3">
              {items.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-slate-300">
                  なし
                </p>
              ) : (
                items.map((d) => (
                  <DealCard
                    key={d.id}
                    deal={d}
                    total={totalByDeal.get(d.id) ?? 0}
                    open={openByDeal.get(d.id) ?? 0}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function DealCard({
  deal,
  total,
  open,
}: {
  deal: DealWithCompany;
  total: number;
  open: number;
}) {
  const isClosed = CLOSED_DEAL_STAGES.includes(deal.stage);
  const orderIndex = DEAL_STAGE_ORDER.indexOf(deal.stage);
  const hasNextStage = orderIndex >= 0 && orderIndex < DEAL_STAGE_ORDER.length - 1;
  const allTasksDone = total > 0 && open === 0;
  const canAdvance = hasNextStage && allTasksDone;
  const nextLabel = hasNextStage
    ? DEAL_STAGE[DEAL_STAGE_ORDER[orderIndex + 1]]
    : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <Link
        href={`/deals/${deal.id}`}
        className="block text-sm font-medium leading-snug text-slate-900 hover:underline"
      >
        {deal.title}
      </Link>
      <p className="mt-1 truncate text-xs text-slate-500">
        {deal.companies?.name ?? "—"}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400">
        {DEAL_CHANNEL[deal.channel]}
      </p>

      <div className="mt-2.5 border-t border-slate-100 pt-2.5">
        {canAdvance ? (
          <form action={advanceDealStage}>
            <input type="hidden" name="id" value={deal.id} />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
            >
              → {nextLabel}へ進む
            </button>
          </form>
        ) : open > 0 ? (
          <span className="text-[11px] text-slate-500">
            残タスク {open} 件
          </span>
        ) : allTasksDone && !hasNextStage ? (
          <span className="text-[11px] text-emerald-600">タスク完了</span>
        ) : !isClosed ? (
          <Link
            href={`/tasks/new?deal_id=${deal.id}`}
            className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-100"
          >
            次アクション未設定
          </Link>
        ) : (
          <span className="text-[11px] text-slate-300">—</span>
        )}
      </div>
    </div>
  );
}

// ───────── 一覧（表）表示 ─────────

function TableView({
  deals,
  stageFilter,
  openByDeal,
}: {
  deals: DealWithCompany[];
  stageFilter: DealStage | null;
  openByDeal: Map<string, number>;
}) {
  return (
    <>
      <form method="get" className="mb-4 flex items-center gap-3">
        <input type="hidden" name="view" value="table" />
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
                        (openByDeal.get(d.id) ?? 0) === 0 && (
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
    </>
  );
}
