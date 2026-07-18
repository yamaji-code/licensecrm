import type { ReactNode } from "react";

/*
 * ページの外枠。余白・最大幅・見出しの大きさを全画面でそろえる。
 * ページ側で px-8 py-8 のような余白を直書きしないこと。
 */

export function PageShell({
  children,
  /** ボードのように画面幅いっぱいに広げたい画面は wide を使う */
  width = "default",
}: {
  children: ReactNode;
  width?: "default" | "wide" | "narrow";
}) {
  const max =
    width === "wide"
      ? "max-w-none"
      : width === "narrow"
        ? "max-w-2xl"
        : "max-w-6xl";
  return (
    <div className={`mx-auto w-full ${max} px-4 py-6 sm:px-6 lg:px-8 lg:py-8`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  /** 件数など、見出しの右に小さく添える値 */
  meta,
  description,
  actions,
  /** 戻り先。詳細ページで使う */
  back,
}: {
  title: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {back ? <div className="mb-2 text-sm">{back}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-xl font-medium text-ink sm:text-2xl">{title}</h1>
            {meta ? (
              <span className="text-sm text-ink-soft">{meta}</span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
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
    </header>
  );
}

/** 画面内の区切り見出し（カードより一段上のまとまり） */
export function SectionTitle({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-medium text-ink">{children}</h2>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
