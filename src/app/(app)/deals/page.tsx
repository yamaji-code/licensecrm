import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  CLOSED_DEAL_STAGES,
  DEAL_CHANNEL,
  DEAL_STAGE,
  DEAL_STAGE_ENTRY,
  STAGE_GROUPS,
  type DealStage,
} from "@/lib/types";
import { setBoardDensity } from "./actions";
import { STAGE_BADGE_STYLE } from "@/components/stage-badge";
import { KpiBar } from "@/components/kpi-bar";
import { DraggableCard, DropColumn } from "@/components/board-dnd";
import { summarizeQuarterKpi } from "@/lib/kpi";
import { jstDateString } from "@/lib/date";
import {
  DealCard,
  displayDealTitle,
  type DealCounts,
  type DealWithRelations,
} from "./board-card";
import {
  Banner,
  Button,
  ButtonLink,
  Card,
  Chip,
  EmptyState,
  Field,
  LoadErrorBanner,
  Segmented,
  Select,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";

// カンバンの列順は STAGE_GROUPS（types.ts）を単一ソースにする。
const BOARD_COLUMNS: DealStage[] = STAGE_GROUPS.flatMap((g) => [...g.stages]);

// 既定で折りたたむ進行外の列（件数が多く日常業務で常時見る対象ではない）
const COLLAPSIBLE_COLUMNS: readonly DealStage[] = ["nurturing", "lost"];

// 列幅。1画面に入る列数を決めるので、増やすときは実機で列数を数えてから変えること。
const COLUMN_WIDTH = {
  comfortable: "w-64",
  compact: "w-48",
} as const;
type Density = keyof typeof COLUMN_WIDTH;

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
    // due_date は期限切れ判定に使う（赤で出す唯一の対象）
    supabase
      .from("tasks")
      .select(
        "deal_id, status, due_date, template_id, stage_task_templates ( is_required )",
      )
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
      ? (deals.find((d) => d.id === advanced) ?? null)
      : null;
  const advancedTo =
    typeof to === "string" && to in DEAL_STAGE ? (to as DealStage) : null;
  const advancedAdded =
    typeof added === "string" && /^\d+$/.test(added) ? Number(added) : 0;

  // 案件ごとのタスク集計。
  // total===0 = 次アクション未設定。必須未完了0（かつ total>0）= 次ステージへ進める
  // （必須 = 手動作成タスク + 雛形の is_required=true。サーバー側 advanceDealStage と同一基準）。
  const today = jstDateString();
  const countsByDeal = new Map<string, DealCounts>();
  const getCounts = (id: string) => {
    let c = countsByDeal.get(id);
    if (!c) {
      c = { total: 0, open: 0, openRequired: 0, overdue: 0 };
      countsByDeal.set(id, c);
    }
    return c;
  };
  for (const t of taskData ?? []) {
    const c = getCounts(t.deal_id as string);
    c.total += 1;
    if (t.status !== "done") {
      c.open += 1;
      const tmpl = t.stage_task_templates as unknown as {
        is_required: boolean;
      } | null;
      if (t.template_id === null || tmpl?.is_required !== false) {
        c.openRequired += 1;
      }
      const due = t.due_date as string | null;
      if (due && due < today) c.overdue += 1;
    }
  }
  const EMPTY_COUNTS: DealCounts = {
    total: 0,
    open: 0,
    openRequired: 0,
    overdue: 0,
  };

  // 上部に出す「手が止まっている件数」。カード1枚ずつ探させないための集計。
  const activeDeals = deals.filter((d) => !CLOSED_DEAL_STAGES.includes(d.stage));
  const overdueCount = activeDeals.filter(
    (d) => (countsByDeal.get(d.id) ?? EMPTY_COUNTS).overdue > 0,
  ).length;
  const noActionCount = activeDeals.filter(
    (d) => (countsByDeal.get(d.id) ?? EMPTY_COUNTS).total === 0,
  ).length;

  return (
    <div
      className={
        isTable
          ? "mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          : // ボードは画面高さに固定し、ヘッダー/KPIバーは動かさず、
            // 案件の列だけを内側でスクロールさせる
            "flex h-full flex-col px-4 pb-4 pt-5 sm:px-6"
      }
    >
      <header className="mb-4 shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h1 className="text-xl font-medium text-ink sm:text-2xl">案件</h1>
              <span className="text-sm text-ink-soft">{deals.length} 件</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isTable && <DensityToggle density={density} />}
            <Segmented
              label="表示形式"
              active={isTable ? "table" : "board"}
              options={[
                { value: "board", label: "ボード", href: "/deals" },
                { value: "table", label: "一覧", href: "/deals?view=table" },
              ]}
            />
            <ButtonLink href="/deals/new" variant="primary">
              案件を追加
            </ButtonLink>
          </div>
        </div>

        {/* 手が止まっている案件の件数。カードを1枚ずつ探させない */}
        {!isTable && (overdueCount > 0 || noActionCount > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {overdueCount > 0 && (
              <Chip tone="danger">期限切れ {overdueCount} 件</Chip>
            )}
            {noActionCount > 0 && (
              <Chip tone="warn">次アクション未設定 {noActionCount} 件</Chip>
            )}
            <span className="text-ink-faint">
              進行中 {activeDeals.length} 件のうち
            </span>
          </div>
        )}
      </header>

      {error && (
        <div className="mb-4 shrink-0">
          <LoadErrorBanner message={error.message} />
        </div>
      )}

      {advancedDeal && advancedTo && (
        <div className="mb-4 shrink-0">
          <Banner
            tone="ok"
            actions={
              <Link
                href="/deals"
                className="text-xs font-medium underline underline-offset-2"
              >
                閉じる
              </Link>
            }
          >
            「{advancedDeal.title}」を{DEAL_STAGE[advancedTo]}へ進めました。
            {advancedAdded > 0 &&
              `タスク ${advancedAdded} 件を自動追加しました。`}
          </Banner>
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
          countsByDeal={countsByDeal}
        />
      ) : (
        <>
          {/* 狭い画面は列を横に並べられないので一覧へ誘導する */}
          <div className="lg:hidden">
            <Banner tone="info">
              ボードは横に広い画面向けです。この画面幅では
              <Link
                href="/deals?view=table"
                className="mx-1 font-medium underline underline-offset-2"
              >
                一覧表示
              </Link>
              が見やすいです。
            </Banner>
          </div>
          {/* 残りの高さを占め、この中で横スクロール・列内の縦スクロールが完結する */}
          <div className="hidden min-h-0 flex-1 lg:block">
            <BoardView
              deals={deals}
              countsByDeal={countsByDeal}
              density={density}
              expandSet={expandSet}
              contractedGenreIds={contractedGenreIds}
            />
          </div>
        </>
      )}
    </div>
  );
}

// 密度切替。cookie 保存のため Server Action（URLパラメータではない）
function DensityToggle({ density }: { density: Density }) {
  return (
    <div
      role="group"
      aria-label="カードの表示密度"
      className="inline-flex items-center rounded-lg border border-line bg-white p-0.5 text-sm"
    >
      {(
        [
          ["comfortable", "標準"],
          ["compact", "コンパクト"],
        ] as const
      ).map(([value, label]) => (
        <form action={setBoardDensity} key={value}>
          <input type="hidden" name="density" value={value} />
          <button
            type="submit"
            aria-pressed={density === value}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              density === value
                ? "bg-brand-700 text-white"
                : "text-ink-soft hover:bg-brand-50 hover:text-brand-700"
            }`}
          >
            {label}
          </button>
        </form>
      ))}
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
  countsByDeal,
  density,
  expandSet,
  contractedGenreIds,
}: {
  deals: DealWithRelations[];
  countsByDeal: Map<string, DealCounts>;
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
  const compact = density === "compact";
  const colW = COLUMN_WIDTH[density];

  return (
    <div className="flex h-full items-stretch gap-4 overflow-x-auto pb-2">
      {STAGE_GROUPS.map((group) => (
        <div key={group.key} className="flex h-full shrink-0 flex-col">
          {/* 列グループ帯（リード / 営業 / 契約・ブランド化 / 進行外） */}
          <div className="mb-1.5 flex shrink-0 items-center gap-2 px-1">
            <span className="text-[11px] font-medium tracking-wide text-ink-faint">
              {group.label}
            </span>
            <span className="h-px min-w-6 flex-1 bg-line" />
          </div>
          <div className="flex min-h-0 flex-1 items-stretch gap-2.5">
            {group.stages.map((col) => {
              const items = byStage.get(col) ?? [];
              const collapsible = COLLAPSIBLE_COLUMNS.includes(col);
              const collapsed = collapsible && !expandSet.has(col);

              if (collapsed) {
                // 折りたたみ帯もドロップ先にする（カードを落として時期見送り/失注へ移せる）
                return (
                  <DropColumn
                    key={col}
                    stage={col}
                    className="flex w-11 shrink-0"
                  >
                    <Link
                      id={`col-${col}`}
                      href={expandHref(expandSet, col, true)}
                      title={`${DEAL_STAGE[col]}（${items.length}件）を開く・ここに落として移動`}
                      className="flex w-full flex-col items-center gap-2 rounded-card border border-line bg-white/60 py-3 transition-colors hover:bg-brand-50"
                    >
                      <span className="rounded-full bg-line px-1.5 py-0.5 text-[11px] font-medium text-ink-soft">
                        {items.length}
                      </span>
                      <span className="text-xs font-medium text-ink-soft [writing-mode:vertical-rl]">
                        {DEAL_STAGE[col]}
                      </span>
                    </Link>
                  </DropColumn>
                );
              }

              return (
                <section
                  key={col}
                  id={`col-${col}`}
                  className={`flex ${colW} shrink-0 flex-col rounded-card border border-line bg-white/60`}
                >
                  <div className="flex items-center justify-between gap-1 border-b border-line px-2.5 py-2">
                    <span
                      title={DEAL_STAGE_ENTRY[col]}
                      className={`truncate rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_BADGE_STYLE[col]}`}
                    >
                      {DEAL_STAGE[col]}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className="text-xs font-medium text-ink-faint">
                        {items.length}
                      </span>
                      {collapsible && (
                        <Link
                          href={expandHref(expandSet, col, false)}
                          aria-label={`${DEAL_STAGE[col]}の列をたたむ`}
                          className="text-xs text-ink-faint transition-colors hover:text-ink"
                        >
                          ×
                        </Link>
                      )}
                    </span>
                  </div>
                  <DropColumn
                    stage={col}
                    className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2"
                  >
                    {items.length === 0 ? (
                      <p className="px-1 py-6 text-center text-xs text-ink-faint">
                        この列に案件はありません
                      </p>
                    ) : (
                      items.map((d) => (
                        <DraggableCard key={d.id} dealId={d.id}>
                          <DealCard
                            deal={d}
                            counts={
                              countsByDeal.get(d.id) ?? {
                                total: 0,
                                open: 0,
                                openRequired: 0,
                                overdue: 0,
                              }
                            }
                            compact={compact}
                            contractedGenreIds={contractedGenreIds}
                          />
                        </DraggableCard>
                      ))
                    )}
                  </DropColumn>
                </section>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ───────── 一覧（表）表示 ─────────

function TableView({
  deals,
  stageFilter,
  genreFilter,
  genres,
  countsByDeal,
}: {
  deals: DealWithRelations[];
  stageFilter: DealStage | null;
  genreFilter: string | null;
  genres: { id: string; name: string }[];
  countsByDeal: Map<string, DealCounts>;
}) {
  const needsAction = (id: string, stage: DealStage) =>
    !CLOSED_DEAL_STAGES.includes(stage) &&
    (countsByDeal.get(id)?.total ?? 0) === 0;
  const isOverdue = (id: string) => (countsByDeal.get(id)?.overdue ?? 0) > 0;

  return (
    <>
      <Card className="mb-4">
        <form
          method="get"
          className="flex flex-wrap items-end gap-3 px-5 py-4"
        >
          <input type="hidden" name="view" value="table" />
          <div className="w-full sm:w-48">
            <Field htmlFor="stage" label="ステージ">
              <Select id="stage" name="stage" defaultValue={stageFilter ?? ""}>
                <option value="">すべて</option>
                {Object.entries(DEAL_STAGE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="w-full sm:w-48">
            <Field htmlFor="genre" label="ジャンル">
              <Select id="genre" name="genre" defaultValue={genreFilter ?? ""}>
                <option value="">すべて</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button type="submit" variant="secondary">
            絞り込む
          </Button>
        </form>
      </Card>

      {deals.length === 0 ? (
        <Card>
          <EmptyState
            title={
              stageFilter || genreFilter
                ? "条件に合う案件はありません"
                : "まだ案件がありません"
            }
            description={
              stageFilter || genreFilter
                ? "絞り込みを外すと、ほかの案件が表示されます。"
                : "営業先を案件として登録すると、ステージ・タスク・KPIが自動で積み上がります。"
            }
            action={
              stageFilter || genreFilter ? (
                <ButtonLink href="/deals?view=table" size="sm">
                  絞り込みを外す
                </ButtonLink>
              ) : (
                <ButtonLink href="/deals/new" variant="primary" size="sm">
                  最初の案件を登録
                </ButtonLink>
              )
            }
          />
        </Card>
      ) : (
        <>
          <Card className="hidden sm:block">
            <Table caption="案件の一覧">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>案件名</TH>
                  <TH>取引先</TH>
                  <TH>ステージ</TH>
                  <TH>ジャンル</TH>
                  <TH>チャネル</TH>
                  <TH>更新日</TH>
                </TR>
              </THead>
              <TBody>
                {deals.map((d) => (
                  <TR key={d.id}>
                    <TD>
                      <Link
                        href={`/deals/${d.id}`}
                        className="font-medium text-ink hover:text-brand-700 hover:underline"
                      >
                        {displayDealTitle(d.title, d.companies?.name)}
                      </Link>
                    </TD>
                    <TD className="text-ink-soft">
                      {d.companies?.name ?? "—"}
                    </TD>
                    <TD>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            STAGE_BADGE_STYLE[d.stage]
                          }`}
                        >
                          {DEAL_STAGE[d.stage]}
                        </span>
                        {isOverdue(d.id) && <Chip tone="danger">期限切れ</Chip>}
                        {needsAction(d.id, d.stage) && (
                          <Chip tone="warn">次アクション未設定</Chip>
                        )}
                      </div>
                    </TD>
                    <TD className="text-ink-soft">{d.genres?.name ?? "—"}</TD>
                    <TD className="text-ink-soft">
                      {DEAL_CHANNEL[d.channel]}
                    </TD>
                    <TD className="text-ink-soft">
                      {d.updated_at.slice(0, 10)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <ul className="space-y-2 sm:hidden">
            {deals.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/deals/${d.id}`}
                  className="block rounded-card border border-line bg-white px-4 py-3 shadow-card transition-colors hover:border-brand-200"
                >
                  <p className="font-medium text-ink">
                    {displayDealTitle(d.title, d.companies?.name)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {d.companies?.name ?? "取引先未設定"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STAGE_BADGE_STYLE[d.stage]
                      }`}
                    >
                      {DEAL_STAGE[d.stage]}
                    </span>
                    {isOverdue(d.id) && <Chip tone="danger">期限切れ</Chip>}
                    {needsAction(d.id, d.stage) && (
                      <Chip tone="warn">次アクション未設定</Chip>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
