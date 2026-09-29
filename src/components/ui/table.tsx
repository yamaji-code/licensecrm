import type { ComponentProps, ReactNode } from "react";

/*
 * 表。狭い画面では横スクロールに逃がす（セルを潰して和文が縦積みになるのを防ぐ）。
 * 一覧そのものをモバイルでカードに落とす場合は MobileCardList を併用する。
 */

export function Table({
  children,
  caption,
  minWidth = "min-w-[36rem]",
}: {
  children: ReactNode;
  /** 画面には出さないが読み上げ用に表の意味を入れる */
  caption?: string;
  /**
   * 表の最小幅。列が多い表は既定のままだと各列が潰れてセルが縦積みになるため、
   * 広めの値を渡して横スクロールに逃がす（Tailwindのクラスで渡す）。
   */
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${minWidth} border-collapse text-sm`}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-line bg-surface text-left text-xs text-ink-soft">
      {children}
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function TR({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={["hover:bg-brand-50/40", className].filter(Boolean).join(" ")}>
      {children}
    </tr>
  );
}

type CellProps = ComponentProps<"td"> & {
  /** 数値列は右寄せにする（桁を比較しやすくするため） */
  numeric?: boolean;
};

export function TH({ numeric, className, children, ...rest }: CellProps) {
  return (
    <th
      scope="col"
      className={[
        "px-4 py-2 font-medium whitespace-nowrap",
        numeric ? "text-right tabular-nums" : "text-left",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </th>
  );
}

export function TD({ numeric, className, children, ...rest }: CellProps) {
  return (
    <td
      className={[
        "px-4 py-2.5 align-middle text-ink",
        numeric ? "text-right tabular-nums" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </td>
  );
}
