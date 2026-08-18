import type { ReactNode } from "react";

/*
 * 通知帯・空状態・読み込み中の骨。
 * 色の用途を固定して「全部が赤くて何も目立たない」状態を作らない:
 *   danger = 手が止まる異常（読み込み失敗・期限切れ）
 *   warn   = 気づいてほしいが作業は続けられる
 *   ok     = 完了・達成
 *   info   = 補足
 */

type Tone = "danger" | "warn" | "ok" | "info";

const TONE: Record<Tone, string> = {
  danger: "border-danger/30 bg-danger-bg text-danger",
  warn: "border-warn/30 bg-warn-bg text-warn",
  ok: "border-ok/30 bg-ok-bg text-ok",
  info: "border-brand-200 bg-brand-50 text-brand-700",
};

export function Banner({
  tone = "info",
  title,
  children,
  actions,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={[
        "flex flex-wrap items-start justify-between gap-3 rounded-card border px-4 py-3 text-sm",
        TONE[tone],
      ].join(" ")}
    >
      <div className="min-w-0">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? (
          <div className={title ? "mt-0.5 leading-relaxed" : "leading-relaxed"}>
            {children}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/**
 * 一覧の読み込み失敗。6ファイルで同じ文言をコピペしていたのでここに集約する。
 * 「データが消えたわけではない」ことを必ず伝える（利用者が焦って再入力しないため）。
 */
export function LoadErrorBanner({ message }: { message: string }) {
  return (
    <Banner tone="danger" title="読み込みに失敗しました">
      {message}
      <span className="block text-xs opacity-80">
        表示できていないだけで、データが消えたわけではありません。時間をおいて再読み込みしても直らない場合は共有してください。
      </span>
    </Banner>
  );
}

/** データ0件のときの表示。「なし」だけで終わらせず、次の一手を必ず置く */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs leading-relaxed text-ink-soft">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** 読み込み中の骨。loading.tsx から使う */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={["animate-pulse rounded-lg bg-line/70", className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-4" role="status" aria-label="読み込み中">
      <span className="sr-only">読み込み中です</span>
      <Skeleton className="h-7 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
