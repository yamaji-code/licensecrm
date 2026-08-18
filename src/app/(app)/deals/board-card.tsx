import Link from "next/link";
import {
  CLOSED_DEAL_STAGES,
  DEAL_STAGE,
  DEAL_STAGE_ORDER,
  TIER,
  type Deal,
  type TaskPriority,
  type Tier,
} from "@/lib/types";
import { advanceDealStage } from "./actions";
import { Chip } from "@/components/ui";

export type DealWithRelations = Deal & {
  companies: {
    name: string;
    target_brand: string | null;
    tier: Tier | null;
  } | null;
  genres: { name: string } | null;
};

export type DealCounts = {
  total: number;
  open: number;
  openRequired: number;
  overdue: number;
};

export type DealNextAction = {
  title: string;
  priority: TaskPriority;
  due_date: string | null;
};

/*
 * 案件名から、末尾の「（会社名）」を落として表示する。
 * 旧CRMからの移行データは案件名に会社名が入っており、カード内で会社名が2回出て
 * 3行に折り返していた（1画面に3枚しか入らない原因）。
 * データは書き換えず表示だけを整える。完全一致のときだけ落とし、少しでも違えば元のまま出す。
 */
export function displayDealTitle(title: string, companyName?: string | null) {
  if (!companyName) return title;
  const normalize = (s: string) => s.replace(/[\s　]/g, "");
  const company = normalize(companyName);
  if (company === "") return title;

  const match = title.match(/^(.*?)[（(]([^（()）]*)[)）]\s*$/);
  if (!match) return title;

  const [, head, inside] = match;
  if (normalize(inside) !== company) return title;
  const trimmed = head.trim();
  // 「（会社名）」だけの案件名は落とすと空になるので元のまま返す
  return trimmed === "" ? title : trimmed;
}

/*
 * ボードのカード。案件名（ブランド）・法人名・next action（全件）を見せることを優先し、
 * 密度より情報量を優先する（サヤカさんの指定）。文字は小さめにして情報量を確保する。
 */
export function DealCard({
  deal,
  counts,
  nextActions,
  compact,
}: {
  deal: DealWithRelations;
  counts: DealCounts;
  nextActions: DealNextAction[];
  compact: boolean;
}) {
  const { total, open, openRequired, overdue } = counts;
  const isClosed = CLOSED_DEAL_STAGES.includes(deal.stage);
  const orderIndex = DEAL_STAGE_ORDER.indexOf(deal.stage);
  const hasNextStage =
    orderIndex >= 0 && orderIndex < DEAL_STAGE_ORDER.length - 1;
  // 必須タスク（手動 + 雛形 is_required）が全完了なら進行可（任意タスクは残っていてよい）
  const allRequiredDone = total > 0 && openRequired === 0;
  const canAdvance = hasNextStage && allRequiredDone;
  const nextLabel = hasNextStage
    ? DEAL_STAGE[DEAL_STAGE_ORDER[orderIndex + 1]]
    : null;

  const companyName = deal.companies?.name ?? null;
  const tier = deal.companies?.tier ?? null;

  return (
    <div
      className={[
        "rounded-lg border bg-white shadow-card transition-colors hover:border-brand-200",
        compact ? "px-3 py-2.5" : "px-3.5 py-3",
        // 期限切れがある案件だけ左の縁で示す。赤はここと読み込み失敗にしか使わない
        overdue > 0 ? "border-line border-l-2 border-l-danger" : "border-line",
      ].join(" ")}
    >
      <Link
        href={`/deals/${deal.id}`}
        className="block text-xs font-medium leading-snug text-ink hover:text-brand-700 hover:underline"
      >
        <span className="line-clamp-2">
          {displayDealTitle(deal.title, companyName)}
        </span>
      </Link>

      {/* 法人名 */}
      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-ink-soft">
        <span className="min-w-0 flex-1 truncate">
          {companyName ?? "取引先未設定"}
        </span>
        {tier && (
          <Chip tone="neutral" className="shrink-0">
            {TIER[tier]}
          </Chip>
        )}
      </div>

      {/* next action: 件数で丸めず全件出す（小さくてよいので見切れさせない・カードの高さは案件ごとに変わってよい） */}
      {nextActions.length > 0 && (
        <ul className="mt-1.5 space-y-px border-t border-line pt-1.5">
          {nextActions.map((t, i) => (
            <li
              key={i}
              className="truncate text-[8px] leading-tight text-ink-soft"
              title={t.title}
            >
              ・{t.title}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2">
        {isClosed ? (
          // 進行外（SV案内可能/時期見送り/失注）は進行文言を出さず中立表示にする
          open > 0 ? (
            <span className="text-[11px] text-ink-soft">残タスク {open} 件</span>
          ) : (
            <span className="text-[11px] text-ink-faint">—</span>
          )
        ) : overdue > 0 ? (
          <Link
            href={`/deals/${deal.id}`}
            className="inline-flex items-center rounded-md border border-danger/25 bg-danger-bg px-1.5 py-0.5 text-[11px] font-medium text-danger hover:brightness-95"
          >
            期限切れ {overdue} 件
          </Link>
        ) : canAdvance ? (
          <form action={advanceDealStage}>
            <input type="hidden" name="id" value={deal.id} />
            <input type="hidden" name="from_stage" value={deal.stage} />
            <button
              type="submit"
              title={`${nextLabel}へ進む`}
              className="flex w-full items-center justify-center gap-1 rounded-md bg-brand-700 px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-brand-800"
            >
              {compact ? "次へ進む" : `${nextLabel}へ進む`}
            </button>
          </form>
        ) : openRequired > 0 ? (
          <span className="text-[11px] text-ink-soft">
            必須タスク残 {openRequired} 件
          </span>
        ) : (
          // アクティブ案件でタスク0件 = 次アクション未設定。
          // 該当が半数近くあるため、赤ではなく注意色にして「期限切れ」と区別する
          <Link
            href={`/tasks/new?deal_id=${deal.id}`}
            className="inline-flex items-center rounded-md border border-warn/25 bg-warn-bg px-1.5 py-0.5 text-[11px] font-medium text-warn hover:brightness-95"
          >
            next action未設定
          </Link>
        )}
      </div>
    </div>
  );
}
