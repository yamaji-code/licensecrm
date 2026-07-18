import Link from "next/link";
import type { ReactNode } from "react";

/*
 * 表示の切り替え（ボード/一覧・標準/コンパクトなど）。
 * 「押せるボタン」ではなく「今どちらか」を示す部品なので、主ボタンより弱い見た目にする。
 */

export type SegmentedOption = {
  value: string;
  label: ReactNode;
  href: string;
  /** 読み上げ用。label がアイコンや短縮語のときに入れる */
  srLabel?: string;
};

export function Segmented({
  options,
  active,
  label,
}: {
  options: SegmentedOption[];
  active: string;
  /** 何の切り替えかを読み上げに伝える（例: 表示形式） */
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center rounded-lg border border-line bg-white p-0.5 text-sm"
    >
      {options.map((opt) => {
        const isActive = opt.value === active;
        return (
          <Link
            key={opt.value}
            href={opt.href}
            aria-current={isActive ? "true" : undefined}
            className={[
              "rounded-md px-3 py-1.5 font-medium transition-colors",
              isActive
                ? "bg-brand-700 text-white"
                : "text-ink-soft hover:bg-brand-50 hover:text-brand-700",
            ].join(" ")}
          >
            {opt.label}
            {opt.srLabel ? <span className="sr-only">{opt.srLabel}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}
