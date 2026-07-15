import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getQuarterRange, KPI_TARGET } from "@/lib/kpi";
import {
  CLOSED_DEAL_STAGES,
  DEAL_CHANNEL,
  TASK_STATUS,
  type Deal,
  type DealChannel,
  type DealKpiFact,
} from "@/lib/types";

// 指定した ISO 日時が四半期レンジ [start, end) に入っているか判定する
function inRange(iso: string | null, start: Date, end: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

// 分母が 0 のときは "—" にしてゼロ除算エラー・NaN 表示を避ける
function formatRate(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function ProgressBar({ value, target }: { value: number; target: number }) {
  const pct =
    target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-slate-900 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default async function Dashboard() {
  const supabase = await createClient();

  const [
    { count: companyCount },
    { count: taskOpenCount },
    { data: recentTasks },
    { data: kpiFactsData, error: kpiFactsError },
    { data: dealStageData, error: dealStageError },
    { data: openDealTaskData },
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
    supabase
      .from("tasks")
      .select("deal_id")
      .not("deal_id", "is", null)
      .neq("status", "done"),
  ]);

  // KPI 集計クエリが失敗した場合（0002 未適用・RLS 失敗など）は、
  // 「商談 0/20・契約 0/2」を実データと誤認させないためエラーを検知する。
  // deals/page.tsx・tasks/page.tsx と同じ「読み込みエラー」バナー方針に合わせる。
  const kpiError = kpiFactsError ?? dealStageError;

  // --- KPI: 当四半期の商談実施・契約集計 ---
  const kpiFacts = (kpiFactsData ?? []) as DealKpiFact[];
  const { start, end, label: quarterLabel } = getQuarterRange();

  const meetingsThisQ = kpiFacts.filter((f) =>
    inRange(f.first_meeting_at, start, end),
  );
  const contractsThisQ = kpiFacts.filter((f) =>
    inRange(f.first_contract_at, start, end),
  );
  const meetingsCount = meetingsThisQ.length;
  const contractsCount = contractsThisQ.length;

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

  // --- 次アクション未設定のアクティブ案件件数（/deals 一覧と同じロジック） ---
  const dealStages = (dealStageData ?? []) as Pick<Deal, "id" | "stage">[];
  const dealsWithOpenTask = new Set(
    (openDealTaskData ?? []).map((t) => t.deal_id as string),
  );
  const noNextActionCount = dealStages.filter(
    (d) => !CLOSED_DEAL_STAGES.includes(d.stage) && !dealsWithOpenTask.has(d.id),
  ).length;

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
              / {KPI_TARGET.meetings} 件
            </span>
          </p>
          <ProgressBar value={meetingsCount} target={KPI_TARGET.meetings} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">{quarterLabel} 契約</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {contractsCount}
            <span className="ml-1 text-base font-normal text-slate-400">
              / {KPI_TARGET.contracts} 件
            </span>
          </p>
          <ProgressBar value={contractsCount} target={KPI_TARGET.contracts} />
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
