import type { ReactNode } from "react";

/*
 * カード（白い面）。角丸・影・境界線・余白のばらつきを止めるための唯一の入口。
 */

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        // overflow-hidden はカードの角丸で中身（表など）を切るため。
        // 表の横スクロールは Table 内側の overflow-x-auto で成立するので潰れない。
        "overflow-hidden rounded-card border border-line bg-white shadow-card",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  );
}

/** カード上部の見出し行。右側に操作を置ける */
export function CardHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-medium text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={["px-5 py-4", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

/**
 * 「ラベル: 値」の定義リスト。案件詳細・取引先詳細の属性表示に使う。
 * 幅の狭い右レールに置くときは columns={1} にする
 * （画面幅で2列にするとレール内で値が潰れるため）。
 */
export function DescList({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 1 | 2;
}) {
  return (
    <dl
      className={`grid grid-cols-1 gap-x-6 gap-y-4 ${
        columns === 2 ? "sm:grid-cols-2" : ""
      }`}
    >
      {children}
    </dl>
  );
}

export function DescItem({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  );
}
