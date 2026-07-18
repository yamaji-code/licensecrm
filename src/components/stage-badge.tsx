import { DEAL_STAGE, type DealStage } from "@/lib/types";

// ステージバッジの配色（単一ソース。各ページに重複定義しない）
//
// 色数を絞る方針: ステージごとに別々の色を割り当てると11色の虹になり、
// 「色が何を意味するのか」が読み取れなくなる。そこで色は STAGE_GROUPS の
// フェーズ群に対応させ、明るい面＋濃い文字（可読性最大）で統一する。
//   リード          → ブランド薄（これから着手）
//   営業            → ブランド中（進行中）
//   契約・ブランド化 → グリーン（獲得済み。SV案内可能=ゴールは一段濃く）
//   進行外          → グレー（保留）／ローズ（失注）
export const STAGE_BADGE_STYLE: Record<DealStage, string> = {
  // リード
  sourced: "bg-brand-50 text-brand-700",
  picked: "bg-brand-100 text-brand-800",
  // 営業
  approaching: "bg-brand-100 text-brand-800",
  meeting_set: "bg-brand-100 text-brand-800",
  meeting_done: "bg-brand-200 text-brand-900",
  negotiating: "bg-brand-200 text-brand-900",
  // 契約・ブランド化
  contract: "bg-emerald-50 text-emerald-700",
  branding: "bg-emerald-50 text-emerald-700",
  sv_ready: "bg-emerald-100 text-emerald-800",
  // 進行外
  nurturing: "bg-surface text-ink-soft",
  lost: "bg-rose-50 text-rose-700",
};

export function StageBadge({
  stage,
  className = "",
}: {
  stage: DealStage;
  className?: string;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_BADGE_STYLE[stage]} ${className}`}
    >
      {DEAL_STAGE[stage]}
    </span>
  );
}
