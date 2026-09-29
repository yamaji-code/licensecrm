import type { ReactNode } from "react";

/*
 * KPIサマリー帯。ラベル＋大きな数値を横一列に並べ、下に注記を置く。
 * カードを数字の数だけ並べると視線が散るため、1つの枠にまとめる。
 * 数値は tabular-nums で桁を揃える（桁数が変わっても位置がぶれないように）。
 */

export function StatStrip({
  children,
  note,
}: {
  children: ReactNode;
  /** 帯の下に置く細字の注記（集計の定義・前提など） */
  note?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-line bg-white shadow-card">
      <div className="flex flex-wrap divide-line sm:divide-x">
        {children}
      </div>
      {note ? (
        <p className="border-t border-line px-5 py-2.5 text-[11px] leading-relaxed text-ink-faint">
          {note}
        </p>
      ) : null}
    </div>
  );
}

/** 帯の中の1項目。tone は既存の状態色に合わせる（ok=達成 / warn=未達） */
export function StatItem({
  label,
  value,
  sub,
  tone,
  note,
}: {
  label: string;
  value: ReactNode;
  /** 数値のすぐ後ろに小さく添える単位や目標値（例: / 20 件） */
  sub?: ReactNode;
  tone?: "ok" | "warn";
  /** その項目だけの補足。帯全体の注記は StatStrip の note を使う */
  note?: ReactNode;
}) {
  const valueTone =
    tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <div className="min-w-[8.5rem] flex-1 px-5 py-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p
        className={`mt-1 text-2xl font-medium tabular-nums ${valueTone}`}
      >
        {value}
        {sub ? (
          <span className="ml-1 text-sm font-normal text-ink-faint">{sub}</span>
        ) : null}
      </p>
      {note ? (
        <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">{note}</p>
      ) : null}
    </div>
  );
}
