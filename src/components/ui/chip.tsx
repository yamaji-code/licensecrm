import type { ReactNode } from "react";

/*
 * 小さなラベル（チップ）の素。
 * ステージ・企業規模など「意味を持つ色」は components/badges.tsx と stage-badge.tsx が
 * それぞれの対応表を持つ。ここは見た目の素だけを提供する。
 */

export type ChipTone =
  | "neutral"
  | "brand"
  | "ok"
  | "warn"
  | "danger"
  | "muted";

const TONE: Record<ChipTone, string> = {
  neutral: "border-line bg-surface text-ink-soft",
  brand: "border-brand-200 bg-brand-50 text-brand-700",
  ok: "border-ok/25 bg-ok-bg text-ok",
  warn: "border-warn/25 bg-warn-bg text-warn",
  danger: "border-danger/25 bg-danger-bg text-danger",
  muted: "border-line bg-white text-ink-faint",
};

export function Chip({
  tone = "neutral",
  children,
  className,
  title,
}: {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={[
        "inline-flex max-w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-[11px] leading-tight",
        TONE[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
