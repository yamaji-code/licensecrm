import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  CLOSED_DEAL_STAGES,
  DEAL_CHANNEL,
  DEAL_STAGE,
  DEAL_STAGE_ENTRY,
  DEAL_STAGE_ORDER,
  PB_STATUS,
  STAGE_GROUPS,
  type Deal,
  type DealStage,
  type CompanySize,
} from "@/lib/types";
import { advanceDealStage, setBoardDensity } from "./actions";
import { STAGE_BADGE_STYLE } from "@/components/stage-badge";
import { KpiBar } from "@/components/kpi-bar";
import { summarizeQuarterKpi } from "@/lib/kpi";

// カンバンの列順は STAGE_GROUPS（types.ts）を単一ソースにする。
const BOARD_COLUMNS: DealStage[] = STAGE_GROUPS.flatMap((g) => [...g.stages]);

// 既定で折りたたむ進行外の列（件数が多く日常業務で常時見る対象ではない）
const COLLAPSIBLE_COLUMNS: readonly DealStage[] = ["nurturing", "lost"];

// 表示密度ごとのクラス（Tailwind は完全なクラス文字列でないと検出されないため、
// テンプレート結合ではなく定数マップで切り替える）
const DENSITY = {
  comfortable: {
    colW: "w-72",
    colBody: "gap-2 p-3",
    card: "rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm",
    title: "block text-sm font-medium leading-snug text-slate-900 hover:underline",
  },
  compact: {
    colW: "w-56",
    colBody: "gap-1.5 p-2",
    card: "rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm",
    title:
      "block truncate text-[13px] font-medium leading-snug text-slate-900 hover:underline",
  },
} as const;
type Density = keyof typeof DENSITY;

type DealWithRelations = Deal & {
  companies: { name: string; company_size: CompanySize | null } | null;
  genres: { name: string } | null;
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{
    stage?: string | string[];
    view?: string;
    expand?: string | string[];
    genre?: string | string[];
    advanced?: string | string[];
    to?: string | string[];
    added?: string | string[];
  }>;
}) {
  const { stage, view, expand, genre, advanced, to, added } =
    await searchParams;
  // 表示モード: 既定はボード。table を指定したときだけ表形式。
  const isTable = view === "table";
  // 表示密度: cookie 保存（トグルは Server Action setBoardDensity）
  const cookieStore = await cookies();
  const density: Density =
    cookieStore.get("board_density")?.value === "compact"
      ? "compact"
      : "comfortable";
  // 不正な値は無視して「すべて」扱いにする（表形式の絞り込み用）
  const stageFilter =
    typeof stage === "string" && stage in DEAL_STAGE
      ? (stage as DealStage)
      : null;
  const genreFilter = typeof genre === "string" && genre !== "" ? genre : null;
  // 展開中の進行外列（?expand=nurturing,lost）
  const expandSet = new Set(
    (typeof expand === "string" ? expand.split(",") : []).filter((s) =>
      COLLAPSIBLE_COLUMNS.includes(s as DealStage),
    ),
  );

  const supabase = await createClient();
  let query = supabase
    .from("deals")
    .select("*, companies ( name, company_size ), genres ( name )")
    .order("created_at", { ascending: false });
  // 表形式のときだけ絞り込みを適用する（ボードは全件を列に分ける）
  if (isTable && stageFilter) {
    query = query.eq("stage", stageFilter);
  }
  if (isTable && genreFilter) {
    query = query.eq("genre_id", genreFilter);
  }

  // 案件・タスク集計・ジャンル・ジャンル実績を並列取得
  const [
    { data, error },
    { data: taskData },
    { data: genreData },
    { data: genreStatData },
    { data: kpiFactsData, error: kpiFactsError },
  ] = await Promise.all([
    query,
    supabase
      .from("tasks")
      .select("deal_id, status, template_id, stage_task_templates ( is_required )")
      .not("deal_id", "is", null),
    supabase
      .from("genres")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("genre_stats").select("genre_id, contracted_count"),
    // ボード上部のKPIバー用（集計はダッシュボードと同一関数 summarizeQuarterKpi）
    supabase
      .from("deal_kpi_facts")
      .select("first_meeting_at, first_contract_at"),
  ]);
  const kpiSummary = summarizeQuarterKpi(kpiFactsData ?? []);

  const deals = (data ?? []) as DealWithRelations[];
  const genres = (genreData ?? []) as { id: string; name: string }[];
  // 契約到達済みジャンル = 優先度を下げて表示するジャンル
  const contractedGenreIds = new Set(
    (genreStatData ?? [])
      .filter((g) => (g.contracted_count ?? 0) > 0)
      .map((g) => g.genre_id as string),
  );

  // ステージ前進直後のフラッシュ表示（advanceDealStage の redirect パラメータ）。
  // 実在する案件のときだけ表示する（URL 直叩き・リロード時の誤表示防止）。
  const advancedDeal =
    typeof advanced === "string"
      ? deals.find((d) => d.id === advanced) ?? null
      : null;
  const advancedTo =
    typeof to === "string" && to in DEAL_STAGE ? (to as DealStage) : null;
  const advancedAdded =
    typeof added === "string" && /^\d+$/.test(added) ? Number(added) : 0;

  // 案件ごとのタスク集計。
  // total===0 = 次アクション未設定。必須未完了0（かつ total>0）= 次ステージへ進める
  // （必須 = 手動作成タスク + 雛形の is_required=true。サーバー側 advanceDealStage と同一基準）。
  const totalByDeal = new Map<string, number>();
  const openByDeal = new Map<string, number>();
  const openRequiredByDeal = new Map<string, number>();
  for (const t of taskData ?? []) {
    const id = t.deal_id as string;
    totalByDeal.set(id, (totalByDeal.get(id) ?? 0) + 1);
    if (t.status !== "done") {
      openByDeal.set(id, (openByDeal.get(id) ?? 0) + 1);
      const tmpl = t.stage_task_templates as unknown as {
        is_required: boolean;
      } | null;
      if (t.template_id === null || tmpl?.is_required !== false) {
        openRequiredByDeal.set(id, (openRequiredByDeal.get(id) ?? 0) + 1);
      }
    }
  }

  return (
    <div
      className={
        isTable
          ? "mx-auto max-w-5xl px-8 py-10"
          : // ボードは画面高さに固定し、ヘッダー/KPIバーは動かさず、
            // 案件の列だけを内側でスクロールさせる
            "flex h-full flex-col px-6 pb-4 pt-6"
      }
    >
      <header className="mb-4 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">案件</h1>
          <p className="mt-1 text-sm text-slate-500">{deals.length} 件</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 表示密度切替（ボード表示のときのみ） */}
          {!isTable && (
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
              <form action={setBoardDensity}>
                <input type="hidden" name="density" value="comfortable" />
                <button
                  type="submit"
                  className={`rounded-md px-3 py-1.5 font-medium transition ${
                    density === "comfortable"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  標準
                </button>
              </form>
              <form action={setBoardDensity}>
                <input type="hidden" name="density" value="compact" />
                <button
                  type="submit"
                  className={`rounded-md px-3 py-1.5 font-medium transition ${
                    density === "compact"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  コンパクト
                </button>
              </form>
            </div>
          )}
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

      {advancedDeal && advancedTo && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p>
            「{advancedDeal.title}」を{DEAL_STAGE[advancedTo]}へ進めました。
            {advancedAdded > 0 &&
              `タスク ${advancedAdded} 件を自動追加しました。`}
          </p>
          <Link
            href="/deals"
            className="ml-4 shrink-0 text-xs font-medium text-emerald-700 hover:underline"
          >
            閉じる
          </Link>
        </div>
      )}

      {!isTable && (
        <KpiBar
          quarterLabel={kpiSummary.quarterLabel}
          meetingsCount={kpiSummary.meetingsCount}
          contractsCount={kpiSummary.contractsCount}
          targets={kpiSummary.targets}
          hasError={Boolean(kpiFactsError)}
        />
      )}

      {isTable ? (
        <TableView
          deals={deals}
          stageFilter={stageFilter}
          genreFilter={genreFilter}
          genres={genres}
          totalByDeal={totalByDeal}
        />
      ) : (
        // 残りの高さを占め、この中で横スクロール・列内の縦スクロールが完結する
        <div className="min-h-0 flex-1">
          <BoardView
            deals={deals}
            totalByDeal={totalByDeal}
            openByDeal={openByDeal}
            openRequiredByDeal={openRequiredByDeal}
            density={density}
            expandSet={expandSet}
            contractedGenreIds={contractedGenreIds}
          />
        </div>
      )}
    </div>
  );
}

// ───────── ボード表示 ─────────

// 進行外列の開閉リンク（展開状態は ?expand= で表現し、アンカーで対象列へ着地する）
function expandHref(expandSet: Set<string>, col: DealStage, open: boolean) {
  const next = new Set(expandSet);
  if (open) {
    next.add(col);
  } else {
    next.delete(col);
  }
  const q = next.size > 0 ? `?expand=${[...next].join(",")}` : "";
  return `/deals${q}${open ? `#col-${col}` : ""}`;
}

function BoardView({
  deals,
  totalByDeal,
  openByDeal,
  openRequiredByDeal,
  density,
  expandSet,
  contractedGenreIds,
}: {
  deals: DealWithRelations[];
  totalByDeal: Map<string, number>;
  openByDeal: Map<string, number>;
  openRequiredByDeal: Map<string, number>;
  density: Density;
  expandSet: Set<string>;
  contractedGenreIds: Set<string>;
}) {
  const byStage = new Map<DealStage, DealWithRelations[]>();
  for (const col of BOARD_COLUMNS) byStage.set(col, []);
  for (const d of deals) {
    // 既知列にあるものだけ振り分ける（列外の値は check 制約上存在しない）
    byStage.get(d.stage)?.push(d);
  }
  const cls = DENSITY[density];

  return (
    <div className="flex h-full items-stretch gap-5 overflow-x-auto pb-2">
      {STAGE_GROUPS.map((group) => (
        <div key={group.key} className="flex h-full shrink-0 flex-col">
          {/* 列グループ帯（リード / 営業 / 契約・ブランド化 / 進行外） */}
          <div className="mb-1.5 flex shrink-0 items-center gap-2 px-1">
            <span className="text-[11px] font-medium tracking-wide text-slate-400">
              {group.label}
            </span>
            <span className="h-px min-w-6 flex-1 bg-slate-200" />
          </div>
          <div className="flex min-h-0 flex-1 items-stretch gap-3">
            {group.stages.map((col) => {
              const items = byStage.get(col) ?? [];
              const collapsible = COLLAPSIBLE_COLUMNS.includes(col);
              const collapsed = collapsible && !expandSet.has(col);

              if (collapsed) {
                return (
                  <Link
                    key={col}
                    id={`col-${col}`}
                    href={expandHref(expandSet, col, true)}
                    title={`${DEAL_STAGE[col]}（${items.length}件）を開く`}
                    className="flex w-12 shrink-0 flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-3 transition hover:bg-slate-100"
                  >
                    <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                      {items.length}
                    </span>
                    <span className="text-xs font-medium text-slate-500 [writing-mode:vertical-rl]">
                      {DEAL_STAGE[col]}
                    </span>
                  </Link>
                );
              }

              return (
                <section
                  key={col}
                  id={`col-${col}`}
                  className={`flex ${cls.colW} shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-50`}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
                    <span
                      title={DEAL_STAGE_ENTRY[col]}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_BADGE_STYLE[col]}`}
                    >
                      {DEAL_STAGE[col]}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-400">
                        {items.length}
                      </span>
                      {collapsible && (
                        <Link
                          href={expandHref(expandSet, col, false)}
                          title="たたむ"
                          className="text-xs text-slate-400 transition hover:text-slate-600"
                        >
                          ×
                        </Link>
                      )}
                    </span>
                  </div>
                  <div
                    className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${cls.colBody}`}
                  >
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
                          openRequired={openRequiredByDeal.get(d.id) ?? 0}
                          density={density}
                          contractedGenreIds={contractedGenreIds}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function DealCard({
  deal,
  total,
  open,
  openRequired,
  density,
  contractedGenreIds,
}: {
  deal: DealWithRelations;
  total: number;
  open: number;
  openRequired: number;
  density: Density;
  contractedGenreIds: Set<string>;
}) {
  const isClosed = CLOSED_DEAL_STAGES.includes(deal.stage);
  const orderIndex = DEAL_STAGE_ORDER.indexOf(deal.stage);
  const hasNextStage =
    orderIndex >= 0 && orderIndex < DEAL_STAGE_ORDER.length - 1;
  // 必須タスク（手動 + 雛形 is_required）が全完了なら進行可（任意タスクは残っていてよい）
  const allRequiredDone = total > 0 && openRequired === 0;
  const canAdvance = hasNextStage && allRequiredDone;
  const nextLabel = hasNextStage
    ? DEAL_STAGE[DEAL_STAGE_ORDER[orderIndex + 1]]
    : null;
  const cls = DENSITY[density];
  const isCompact = density === "compact";
  const isLarge = deal.companies?.company_size === "large";
  const genreName = deal.genres?.name ?? null;
  const genreContracted =
    deal.genre_id !== null && contractedGenreIds.has(deal.genre_id);
  const pbActive =
    deal.pb_status === "searching" || deal.pb_status === "co_creating";

  return (
    <div className={cls.card}>
      <Link href={`/deals/${deal.id}`} className={cls.title}>
        {deal.title}
      </Link>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <span className="truncate">{deal.companies?.name ?? "—"}</span>
        {!isCompact && isLarge && (
          <span className="shrink-0 rounded bg-slate-200 px-1 py-px text-[10px] font-medium text-slate-600">
            大手
          </span>
        )}
      </p>
      {!isCompact && (
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="truncate">{DEAL_CHANNEL[deal.channel]}</span>
          {genreName &&
            (genreContracted ? (
              // 契約到達済みジャンル = 優先度低（1ジャンル1契約ルール）をグレー+「済」で示す
              <span className="shrink-0 text-slate-300" title="このジャンルは契約済み（優先度低）">
                済 {genreName}
              </span>
            ) : (
              <span className="shrink-0">{genreName}</span>
            ))}
          {pbActive && deal.pb_status && (
            <span className="shrink-0 rounded bg-indigo-100 px-1 py-px text-[10px] font-medium text-indigo-700">
              {PB_STATUS[deal.pb_status]}
            </span>
          )}
        </p>
      )}

      <div
        className={
          isCompact ? "mt-1.5" : "mt-2.5 border-t border-slate-100 pt-2.5"
        }
      >
        {isClosed ? (
          // 進行外（SV案内可能/時期見送り/失注）は進行文言を出さず中立表示にする
          open > 0 ? (
            <span
              className={isCompact ? "text-[10px] text-slate-500" : "text-[11px] text-slate-500"}
            >
              残タスク {open} 件
            </span>
          ) : (
            <span className="text-[11px] text-slate-300">—</span>
          )
        ) : canAdvance ? (
          <form action={advanceDealStage}>
            <input type="hidden" name="id" value={deal.id} />
            <input type="hidden" name="from_stage" value={deal.stage} />
            <button
              type="submit"
              title={`${nextLabel}へ進む`}
              className={`flex w-full items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white transition hover:bg-slate-700 ${
                isCompact ? "py-1" : "py-1.5"
              }`}
            >
              {isCompact ? "→ 次へ" : `→ ${nextLabel}へ進む`}
            </button>
          </form>
        ) : openRequired > 0 ? (
          <span
            className={isCompact ? "text-[10px] text-slate-500" : "text-[11px] text-slate-500"}
          >
            必須タスク残 {openRequired} 件
          </span>
        ) : (
          // アクティブ案件でタスク0件 = 次アクション未設定
          <Link
            href={`/tasks/new?deal_id=${deal.id}`}
            className={`inline-block rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700 hover:bg-red-100 ${
              isCompact ? "text-[10px]" : "text-[11px]"
            }`}
          >
            次アクション未設定
          </Link>
        )}
      </div>
    </div>
  );
}

// ───────── 一覧（表）表示 ─────────

function TableView({
  deals,
  stageFilter,
  genreFilter,
  genres,
  totalByDeal,
}: {
  deals: DealWithRelations[];
  stageFilter: DealStage | null;
  genreFilter: string | null;
  genres: { id: string; name: string }[];
  totalByDeal: Map<string, number>;
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
        <label htmlFor="genre" className="text-sm font-medium text-slate-700">
          ジャンル
        </label>
        <select
          id="genre"
          name="genre"
          defaultValue={genreFilter ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
        >
          <option value="">すべて</option>
          {genres.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
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
                <th className="px-5 py-3 font-medium">ジャンル</th>
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
                          STAGE_BADGE_STYLE[d.stage]
                        }`}
                      >
                        {DEAL_STAGE[d.stage]}
                      </span>
                      {!CLOSED_DEAL_STAGES.includes(d.stage) &&
                        (totalByDeal.get(d.id) ?? 0) === 0 && (
                          <span className="whitespace-nowrap rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            次アクション未設定
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {d.genres?.name ?? "—"}
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
            {stageFilter || genreFilter
              ? "条件に合う案件はありません。"
              : "まだ案件がありません。「案件を追加」から登録してください。"}
          </p>
        )}
      </div>
    </>
  );
}
