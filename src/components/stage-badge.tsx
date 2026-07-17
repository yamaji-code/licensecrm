import { DEAL_STAGE, type DealStage } from "@/lib/types";

// ステージバッジの配色（単一ソース。各ページに重複定義しない）
export const STAGE_BADGE_STYLE: Record<DealStage, string> = {
  sourced: "bg-slate-100 text-slate-600",
  picked: "bg-sky-100 text-sky-700",
  approaching: "bg-blue-100 text-blue-700",
  meeting_set: "bg-indigo-100 text-indigo-700",
  meeting_done: "bg-violet-100 text-violet-700",
  negotiating: "bg-amber-100 text-amber-700",
  contract: "bg-green-100 text-green-700",
  branding: "bg-cyan-100 text-cyan-700",
  sv_ready: "bg-emerald-100 text-emerald-700",
  nurturing: "bg-teal-100 text-teal-700",
  lost: "bg-red-100 text-red-600",
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
