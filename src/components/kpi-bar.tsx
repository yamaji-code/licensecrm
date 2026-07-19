import Link from "next/link";
import { ProgressBar } from "./progress-bar";
import type { KPI_TARGET } from "@/lib/kpi";

// ボード上部の当四半期 KPI スリムバー。
// 集計は lib/kpi.ts の summarizeQuarterKpi（ダッシュボードと同一関数）で行った結果を受け取る。
// エラー時は誤った 0/20 を見せないため数値を出さない（ダッシュボードと同じ原則）。
export function KpiBar({
  quarterLabel,
  meetingsCount,
  contractsCount,
  targets,
  hasError,
}: {
  quarterLabel: string;
  meetingsCount: number;
  contractsCount: number;
  targets: typeof KPI_TARGET;
  hasError: boolean;
}) {
  if (hasError) {
    return (
      <p className="mb-4 text-xs text-ink-faint">
        KPI の読み込みに失敗したため、進捗は非表示です。
      </p>
    );
  }
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card border border-line bg-white px-4 py-2.5 text-sm">
      <span className="text-xs font-medium text-ink-faint">
        今四半期（{quarterLabel}）
      </span>
      <span className="flex items-center gap-2">
        <span className="text-ink-soft">商談</span>
        <span className="font-medium text-ink">
          {meetingsCount}
          <span className="font-normal text-ink-faint">/{targets.meetings}</span>
        </span>
        <ProgressBar
          value={meetingsCount}
          target={targets.meetings}
          className="h-1.5 w-24"
        />
      </span>
      <span className="flex items-center gap-2">
        <span className="text-ink-soft">契約</span>
        <span className="font-medium text-ink">
          {contractsCount}
          <span className="font-normal text-ink-faint">/{targets.contracts}</span>
        </span>
        <ProgressBar
          value={contractsCount}
          target={targets.contracts}
          className="h-1.5 w-24"
        />
      </span>
      <Link
        href="/"
        className="ml-auto text-xs text-ink-soft transition-colors hover:text-ink"
      >
        ダッシュボード →
      </Link>
    </div>
  );
}
