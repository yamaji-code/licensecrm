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
    <div className="mx-auto max-w-4xl px-8 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">ダッシュボード</h1>
        <p className="mt-1 text-sm text-slate-500">
          {quarterLabel} の営業 KPI と社内業務の概況
        </p>
      </header>

      {kpiError && (
        <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          KPI データの読み込みに失敗しました（マイグレーション 0002 未適用の可能性があります）。
          下記の商談・契約・成約率は正しい値ではありません: {kpiError.message}
        </p>
      )}

      {noNextActionCount > 0 && (
        <Link
          href="/deals"
          className="mb-6 block rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 transition hover:border-red-300"
        >
          <span className="font-medium">
            次アクション未設定の案件が {noNextActionCount} 件あります。
          </span>
          <span className="ml-1 underline underline-offset-2">
            案件一覧で確認 →
          </span>
        </Link>
      )}

      {/* KPI プログレス */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">{quarterLabel} 商談実施</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {meetingsCount}
            <span className="ml-1 text-base font-normal text-slate-400">
              / {targets.meetings} 件
            </span>
          </p>
          <ProgressBar
            value={meetingsCount}
            target={targets.meetings}
            className="mt-3 h-2 w-full"
          />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">{quarterLabel} 契約</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {contractsCount}
            <span className="ml-1 text-base font-normal text-slate-400">
              / {targets.contracts} 件
            </span>
          </p>
          <ProgressBar
            value={contractsCount}
            target={targets.contracts}
            className="mt-3 h-2 w-full"
          />
        </div>
      </section>

      {/* 成約率（速報・コホート併記） */}
      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">速報成約率</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {flashRateLabel}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            当Q契約 ÷ 当Q商談の暫定値。契約は前Q以前に商談実施した案件を含むことがあります。
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">コホート成約率</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {cohortRateLabel}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            当Q商談到達 {meetingsCount} 件中、契約到達 {cohortContractCount} 件（追跡中・Q序盤は低く出ます）。
          </p>
        </div>
      </section>

      {/* チャネル別 */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-slate-700">
          チャネル別（全期間・商談到達ベース）
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-5 py-3 font-medium">チャネル</th>
                <th className="px-5 py-3 font-medium">商談到達</th>
                <th className="px-5 py-3 font-medium">契約到達</th>
                <th className="px-5 py-3 font-medium">成約率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {channelStats.map((s) => (
                <tr key={s.channel}>
                  <td className="px-5 py-3 text-slate-800">
                    {DEAL_CHANNEL[s.channel]}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{s.meetings} 件</td>
                  <td className="px-5 py-3 text-slate-600">{s.contracts} 件</td>
                  <td className="px-5 py-3 text-slate-600">{s.rateLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 規模別リードタイム */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-slate-700">
          ステージ別リードタイム（滞在日数の中央値・( )内は件数）
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {hasLeadTimeData ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="px-5 py-3 font-medium">ステージ</th>
                  {SIZE_COLUMNS.map((c) => (
                    <th key={c.key} className="px-5 py-3 font-medium">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leadTimeRows.map((row) => (
                  <tr key={row.stage}>
                    <td className="px-5 py-3 text-slate-800">
                      {DEAL_STAGE[row.stage]}
                    </td>
                    {row.cells.map((cell) => (
                      <td key={cell.key} className="px-5 py-3 text-slate-600">
                        {cell.label}
                        {cell.low && (
                          <span className="ml-1 text-xs text-slate-400">
                            ※少数
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-5 py-6 text-center text-sm text-slate-400">
              まだ計測データがありません（旧CRM移行分は遷移日時が近似のため計測対象外。
              新しい案件がステージを進むと自動で貯まります）
            </p>
          )}
        </div>
      </section>

      {/* ジャンル獲得マップ */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-slate-700">
          ジャンル獲得マップ（1ジャンル1契約・空白ジャンルが次の狙い目）
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {genreStats.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="px-5 py-3 font-medium">ジャンル</th>
                  <th className="px-5 py-3 font-medium">契約済</th>
                  <th className="px-5 py-3 font-medium">進行中案件</th>
                  <th className="px-5 py-3 font-medium">優先度</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {genreStats
                  .filter((g) => g.is_active)
                  .map((g) => {
                    const suppressed =
                      g.priority_override === "suppress" ||
                      (g.priority_override !== "boost" && g.contracted_count > 0);
                    return (
                      <tr key={g.genre_id}>
                        <td className="px-5 py-3 text-slate-800">{g.name}</td>
                        <td className="px-5 py-3 text-slate-600">
                          {g.contracted_count > 0 ? `${g.contracted_count} 件` : "—"}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {g.open_count} 件
                        </td>
                        <td className="px-5 py-3">
                          {suppressed ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                              低（獲得済）
                            </span>
                          ) : (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                              狙い目
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          ) : (
            <p className="px-5 py-6 text-center text-sm text-slate-400">
              ジャンルが未登録です。ジャンルマスタ（業態13種など）を登録すると、
              獲得状況と狙い目がここに表示されます
            </p>
          )}
        </div>
      </section>

      {/* 取引先・未完了タスク（既存） */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
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
