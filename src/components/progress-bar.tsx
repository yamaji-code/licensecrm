// KPI 進捗バー（ダッシュボードのカード・ボード上部バーで共用）。
// className で外側トラックの高さ・幅・余白を指定する（例: "mt-3 h-2 w-full" / "h-1.5 w-24"）。
export function ProgressBar({
  value,
  target,
  className = "",
}: {
  value: number;
  target: number;
  className?: string;
}) {
  const pct =
    target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div
      className={`overflow-hidden rounded-full bg-slate-100 ${className}`}
    >
      <div
        className="h-full rounded-full bg-slate-900 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
