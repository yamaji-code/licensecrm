import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRate, inRange, summarizeQuarterKpi } from "@/lib/kpi";
import { ProgressBar } from "@/components/progress-bar";
import {
  CLOSED_DEAL_STAGES,
  COMPANY_SIZE,
  DEAL_CHANNEL,
  DEAL_STAGE,
  DEAL_STAGE_ORDER,
  TASK_STATUS,
  type Deal,
  type DealChannel,
  type DealKpiFact,
  type GenreStat,
  type StageDuration,
} from "@/lib/types";
import {
  Banner,
  ButtonLink,
  Card,
  CardHeader,
  Chip,
  EmptyState,
  PageHeader,
  PageShell,
  SectionTitle,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";

// 中央値（データなしは null）
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default async function Dashboard() {
  const supabase = await createClient();

  const [
    { count: companyCount },
    { count: taskOpenCount },
    { data: recentTasks },
    { data: kpiFactsData, error: kpiFactsError },
    { data: dealStageData, error: dealStageError },
    { data: dealTaskData, error: dealTaskError },
    { data: durationData },
    { data: genreStatData },
  ] = await Promise.all([
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
    // KPI集計はビュー（deal_kpi_facts）から全件取得し、四半期判定などはJS側で行う
    // （設計書 5節: 「JSでフィルタしてよい、DB量は小さい」前提）
    supabase.from("deal_kpi_facts").select("*"),
    supabase.from("deals").select("id, stage"),
    // 案件に紐づく全タスク（完了含む）。「タスクが1件も無い＝次アクション未設定」の判定に使う
    // （ボードの赤バッジと同じ基準にする。全完了で"進める"案件は未設定扱いにしない）
    supabase.from("tasks").select("deal_id").not("deal_id", "is", null),
    // 規模別リードタイム（stage_durations ビュー）。滞在確定分だけを集計に使う
    supabase.from("stage_durations").select("*"),
    // ジャンル獲得マップ（genre_stats ビュー）
    supabase
      .from("genre_stats")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  // KPI 集計クエリが失敗した場合（0002 未適用・RLS 失敗など）は、
  // 「商談 0/20・契約 0/2」を実データと誤認させないためエラーを検知する。
  // dealTaskData の失敗は「次アクション未設定」の誤カウントにつながるため併せて検知する。
  // deals/page.tsx・tasks/page.tsx と同じ「読み込みエラー」バナー方針に合わせる。
  const kpiError = kpiFactsError ?? dealStageError ?? dealTaskError;

  // 注意（山路さん確認事項 #9・未確定）: 設計§5 は「商談を経ず契約直行した案件」を
  // coalesce(first_meeting_at, first_contract_at) で救済する案があるが、ビュー・集計とも未実装。
  // 現状はチャネル別の母数を「商談到達ベース」に統一しており、飛び越え契約はチャネル別内訳に出ない。
  // #9 の確定後、必要なら deal_kpi_facts ビューに coalesce を入れる（または救済しない旨をUIに注記）。

  // --- KPI: 当四半期の商談実施・契約集計（ボードのKPIバーと同一の共通関数） ---
  const kpiFacts = (kpiFactsData ?? []) as DealKpiFact[];
  const {
    quarterLabel,
    start,
    end,
    meetingsCount,
    contractsCount,
    targets,
  } = summarizeQuarterKpi(kpiFacts);

  const meetingsThisQ = kpiFacts.filter((f) =>
    inRange(f.first_meeting_at, start, end),
  );

  // 速報成約率 = 当Q契約 ÷ 当Q商談（暫定値。契約は前Q以前に商談実施した案件を含みうる）
  const flashRateLabel = formatRate(contractsCount, meetingsCount);
  // コホート成約率 = 当Q商談到達案件のうち、契約到達済みの割合（契約タイミングは問わない・追跡中）
  const cohortContractCount = meetingsThisQ.filter(
    (f) => f.first_contract_at !== null,
  ).length;
  const cohortRateLabel = formatRate(cohortContractCount, meetingsCount);

  // チャネル別: 全期間の商談到達を母数にする（当Qのみだとサンプルが少なすぎて傾向が見えないため）
  const channelStats = (Object.keys(DEAL_CHANNEL) as DealChannel[]).map(
    (channel) => {
      const channelMeetings = kpiFacts.filter(
        (f) => f.channel === channel && f.first_meeting_at !== null,
      );
      const channelContracts = channelMeetings.filter(
        (f) => f.first_contract_at !== null,
      );
      return {
        channel,
        meetings: channelMeetings.length,
        contracts: channelContracts.length,
        rateLabel: formatRate(channelContracts.length, channelMeetings.length),
      };
    },
  );

  // --- 次アクション未設定のアクティブ案件件数（ボードの赤バッジと同じ「タスク0件」基準） ---
  const dealStages = (dealStageData ?? []) as Pick<Deal, "id" | "stage">[];
  const dealsWithAnyTask = new Set(
    (dealTaskData ?? []).map((t) => t.deal_id as string),
  );
  const noNextActionCount = dealStages.filter(
    (d) => !CLOSED_DEAL_STAGES.includes(d.stage) && !dealsWithAnyTask.has(d.id),
  ).length;

  // --- 規模別リードタイム（ステージ滞在日数の中央値） ---
  // 滞在が確定した区間のみ集計（進行中は含めない）。
  // 旧CRM移行案件は遷移日時に近似を含むため計測対象外（migrated_from_legacy で除外）。
  const durations = (durationData ?? []) as StageDuration[];
  const completedStays = durations.filter(
    (d) => !d.is_current && !d.migrated_from_legacy,
  );
  const SIZE_COLUMNS = [
    { key: "large", label: COMPANY_SIZE.large },
    { key: "sme", label: COMPANY_SIZE.sme },
    { key: "unset", label: "未設定" },
  ] as const;
  const leadTimeRows = DEAL_STAGE_ORDER.filter((s) => s !== "sv_ready").map(
    (stage) => ({
      stage,
      cells: SIZE_COLUMNS.map((col) => {
        const values = completedStays
          .filter(
            (d) =>
              d.stage === stage &&
              (col.key === "unset"
                ? d.company_size === null
                : d.company_size === col.key),
          )
          .map((d) => d.days_in_stage);
        const m = median(values);
        return {
          key: col.key,
          label: m === null ? "—" : `${m.toFixed(1)}日 (${values.length})`,
          low: values.length > 0 && values.length < 3,
        };
      }),
    }),
  );
  const hasLeadTimeData = completedStays.length > 0;

  // --- ジャンル獲得マップ ---
  const genreStats = (genreStatData ?? []) as GenreStat[];

  return (
    <PageShell>
      <PageHeader
        title="ダッシュボード"
        description={`${quarterLabel} の営業 KPI と社内業務の概況`}
      />

      {kpiError && (
        <div className="mb-4">
          <Banner tone="warn" title="KPI データの読み込みに失敗しました">
            マイグレーション 0002 未適用の可能性があります。下記の商談・契約・成約率は正しい値ではありません:{" "}
            {kpiError.message}
          </Banner>
        </div>
      )}

      {/* 手を動かす情報を先に置く。数字を見るのはそのあと */}
      <section className="mb-6 space-y-4">
        {noNextActionCount > 0 && (
          <Banner
            tone="warn"
            title={`次アクションが決まっていない案件が ${noNextActionCount} 件あります`}
            actions={
              <ButtonLink href="/deals" size="sm">
                案件ボードで確認
              </ButtonLink>
            }
          >
            案件は動いているのに、次に何をするかが登録されていない状態です。
          </Banner>
        )}

        <Card>
          <CardHeader
            title="期限が近いタスク"
            actions={
              <Link
                href="/tasks"
                className="text-xs text-ink-soft transition-colors hover:text-ink"
              >
                すべて見る →
              </Link>
            }
          />
          {recentTasks && recentTasks.length > 0 ? (
            <ul className="divide-y divide-line">
              {recentTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
                >
                  <span className="text-ink">{t.title}</span>
                  <span className="flex items-center gap-3 text-xs text-ink-faint">
                    <span>
                      {TASK_STATUS[t.status as keyof typeof TASK_STATUS]}
                    </span>
                    <span>{t.due_date ?? "期限なし"}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="未完了のタスクはありません"
              description="案件から次のアクションを登録すると、期限が近いものがここに並びます。"
              action={
                <ButtonLink href="/deals" size="sm">
                  案件ボードを開く
                </ButtonLink>
              }
            />
          )}
        </Card>
      </section>

      {/* KPI: 数字は1つのまとまりに圧縮し、縦に積み上げない */}
      <section className="mb-8">
        <SectionTitle>{quarterLabel} の実績</SectionTitle>
        <Card>
          <div className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
            <div className="px-5 py-4">
              <p className="text-xs text-ink-soft">商談実施</p>
              <p className="mt-1 text-2xl font-medium text-ink">
                {meetingsCount}
                <span className="ml-1 text-sm font-normal text-ink-faint">
                  / {targets.meetings} 件
                </span>
              </p>
              <ProgressBar
                value={meetingsCount}
                target={targets.meetings}
                className="mt-2 h-1.5 w-full"
              />
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-ink-soft">契約</p>
              <p className="mt-1 text-2xl font-medium text-ink">
                {contractsCount}
                <span className="ml-1 text-sm font-normal text-ink-faint">
                  / {targets.contracts} 件
                </span>
              </p>
              <ProgressBar
                value={contractsCount}
                target={targets.contracts}
                className="mt-2 h-1.5 w-full"
              />
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-ink-soft">速報成約率</p>
              <p className="mt-1 text-2xl font-medium text-ink">
                {flashRateLabel}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                当Q契約 ÷ 当Q商談の暫定値。契約は前Q以前に商談実施した案件を含むことがあります。
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-ink-soft">コホート成約率</p>
              <p className="mt-1 text-2xl font-medium text-ink">
                {cohortRateLabel}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                当Q商談到達 {meetingsCount} 件中、契約到達 {cohortContractCount}{" "}
                件（追跡中・Q序盤は低く出ます）。
              </p>
            </div>
          </div>
        </Card>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Link
            href="/companies"
            className="rounded-card border border-line bg-white px-5 py-4 shadow-card transition-colors hover:border-brand-200"
          >
            <p className="text-xs text-ink-soft">取引先・顧客</p>
            <p className="mt-1 text-2xl font-medium text-ink">
              {companyCount ?? 0}
              <span className="ml-1 text-sm font-normal text-ink-faint">社</span>
            </p>
          </Link>
          <Link
            href="/tasks"
            className="rounded-card border border-line bg-white px-5 py-4 shadow-card transition-colors hover:border-brand-200"
          >
            <p className="text-xs text-ink-soft">未完了タスク</p>
            <p className="mt-1 text-2xl font-medium text-ink">
              {taskOpenCount ?? 0}
              <span className="ml-1 text-sm font-normal text-ink-faint">件</span>
            </p>
          </Link>
        </div>
      </section>

      {/* チャネル別 */}
      <section className="mt-8">
        <SectionTitle>チャネル別（全期間・商談到達ベース）</SectionTitle>
        <Card>
          <Table caption="獲得チャネル別の商談到達・契約到達・成約率">
            <THead>
              <TR className="hover:bg-transparent">
                <TH>チャネル</TH>
                <TH numeric>商談到達</TH>
                <TH numeric>契約到達</TH>
                <TH numeric>成約率</TH>
              </TR>
            </THead>
            <TBody>
              {channelStats.map((s) => (
                <TR key={s.channel}>
                  <TD>{DEAL_CHANNEL[s.channel]}</TD>
                  <TD numeric className="text-ink-soft">
                    {s.meetings} 件
                  </TD>
                  <TD numeric className="text-ink-soft">
                    {s.contracts} 件
                  </TD>
                  <TD numeric className="text-ink-soft">
                    {s.rateLabel}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      </section>

      {/* 規模別リードタイム */}
      <section className="mt-8">
        <SectionTitle>
          ステージ別リードタイム（滞在日数の中央値・( )内は件数）
        </SectionTitle>
        <Card>
          {hasLeadTimeData ? (
            <Table caption="ステージ別・企業規模別の滞在日数の中央値">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>ステージ</TH>
                  {SIZE_COLUMNS.map((c) => (
                    <TH key={c.key} numeric>
                      {c.label}
                    </TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {leadTimeRows.map((row) => (
                  <TR key={row.stage}>
                    <TD>{DEAL_STAGE[row.stage]}</TD>
                    {row.cells.map((cell) => (
                      <TD key={cell.key} numeric className="text-ink-soft">
                        {cell.label}
                        {cell.low && (
                          <span className="ml-1 text-xs text-ink-faint">
                            ※少数
                          </span>
                        )}
                      </TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState
              title="まだ計測データがありません"
              description="旧CRM移行分は遷移日時が近似のため計測対象外です。新しい案件がステージを進むと自動で貯まります。"
            />
          )}
        </Card>
      </section>

      {/* ジャンル獲得マップ */}
      <section className="mt-8">
        <SectionTitle>
          ジャンル獲得マップ（1ジャンル1契約・空白ジャンルが次の狙い目）
        </SectionTitle>
        <Card>
          {genreStats.length > 0 ? (
            <Table caption="ジャンル別の契約済み件数・進行中案件・優先度">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>ジャンル</TH>
                  <TH numeric>契約済</TH>
                  <TH numeric>進行中案件</TH>
                  <TH>優先度</TH>
                </TR>
              </THead>
              <TBody>
                {genreStats
                  .filter((g) => g.is_active)
                  .map((g) => {
                    const suppressed =
                      g.priority_override === "suppress" ||
                      (g.priority_override !== "boost" &&
                        g.contracted_count > 0);
                    return (
                      <TR key={g.genre_id}>
                        <TD>{g.name}</TD>
                        <TD numeric className="text-ink-soft">
                          {g.contracted_count > 0
                            ? `${g.contracted_count} 件`
                            : "—"}
                        </TD>
                        <TD numeric className="text-ink-soft">
                          {g.open_count} 件
                        </TD>
                        <TD>
                          {suppressed ? (
                            <Chip tone="muted">低（獲得済）</Chip>
                          ) : (
                            <Chip tone="brand">狙い目</Chip>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
              </TBody>
            </Table>
          ) : (
            <EmptyState
              title="ジャンルが未登録です"
              description="ジャンルマスタ（業態13種など）を登録すると、獲得状況と狙い目がここに表示されます。"
            />
          )}
        </Card>
      </section>
    </PageShell>
  );
}
