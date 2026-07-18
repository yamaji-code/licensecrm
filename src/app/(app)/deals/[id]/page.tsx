import Link from "next/link";
import { STAGE_BADGE_STYLE } from "@/components/stage-badge";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { applyStageTemplates, changeDealStage, updateDeal } from "../actions";
import { toggleTaskDone } from "../../tasks/actions";
import {
  CLOSED_DEAL_STAGES,
  DEAL_CHANNEL,
  DEAL_STAGE,
  DEAL_STAGE_ORDER,
  MEETING_FORMAT,
  PB_STATUS,
  SCENE_TAG,
  TASK_PRIORITY,
  type Company,
  type Deal,
  type DealStage,
  type KnowledgeCard,
  type Meeting,
  type Partner,
  type StageEvent,
  type Task,
} from "@/lib/types";

const field =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500";
const labelCls = "block text-sm font-medium text-slate-700";

const PRIORITY_STYLE: Record<string, string> = {
  low: "text-slate-400",
  medium: "text-slate-600",
  high: "text-red-600",
};

const SCENE_TAG_STYLE: Record<string, string> = {
  pb_product: "bg-indigo-100 text-indigo-700",
  maker_intro: "bg-blue-100 text-blue-700",
  pricing: "bg-amber-100 text-amber-700",
  contract_doc: "bg-slate-200 text-slate-700",
  other: "bg-slate-100 text-slate-500",
};

type DealDetail = Deal & {
  companies: Pick<Company, "name"> | null;
  partners: Pick<Partner, "name"> | null;
  genres: { name: string } | null;
};

// stage_events の changed_at（UTC ISO文字列）を JST 表示用に整形する
function formatDateTimeJst(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const [
    { data: dealData, error: dealError },
    { data: eventData, error: eventError },
    { data: taskData, error: taskError },
    { data: meetingData, error: meetingError },
    { data: knowledgeData, error: knowledgeError },
    { data: genreStatData, error: genreStatError },
  ] = await Promise.all([
    supabase
      .from("deals")
      .select("*, companies ( name ), partners ( name ), genres ( name )")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("stage_events")
      .select("*")
      .eq("deal_id", id)
      .order("changed_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("deal_id", id)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false }),
    // この案件に紐づくMTGログ（設計書§3の /deals/[id]「MTG一覧」要件）
    supabase
      .from("meetings")
      .select("*")
      .eq("deal_id", id)
      .order("held_on", { ascending: false }),
    // 関連ナレッジ: このdeal自身に紐づく公開済みナレッジカードを直近3件（deals自体にscene_tagが無いため簡略化）
    supabase
      .from("knowledge_cards")
      .select("*")
      .eq("deal_id", id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3),
    // ジャンル選択肢（契約済みジャンルの注記付き）
    supabase
      .from("genre_stats")
      .select("genre_id, name, is_active, sort_order, contracted_count")
      .order("sort_order", { ascending: true }),
  ]);

  if (dealError || !dealData) {
    notFound();
  }

  // 副次クエリの読み取り失敗は、履歴やMTGが「無い」ように見せず障害として明示する
  // （空表示との誤認を防ぐ。RLS拒否は空配列を返すためここには乗らない）
  const secondaryError =
    eventError ?? taskError ?? meetingError ?? knowledgeError ?? genreStatError;

  const deal = dealData as DealDetail;
  const stageEvents = (eventData ?? []) as StageEvent[];
  const openTasks = (taskData ?? []) as Task[];
  const meetings = (meetingData ?? []) as Meeting[];
  const relatedKnowledge = (knowledgeData ?? []) as KnowledgeCard[];
  const activeGenres = ((genreStatData ?? []) as {
    genre_id: string;
    name: string;
    is_active: boolean;
    contracted_count: number;
  }[]).filter((g) => g.is_active);
  // 現在のジャンルが非活性・取得失敗で選択肢から漏れると、メモだけ編集して保存した時に
  // ブラウザが先頭（未設定）を送り genre_id が黙って null に消える。必ず現在値を選択肢に残す。
  const genreOptions =
    deal.genre_id && !activeGenres.some((g) => g.genre_id === deal.genre_id)
      ? [
          {
            genre_id: deal.genre_id,
            name: deal.genres?.name ?? "（無効なジャンル）",
            is_active: false,
            contracted_count: 0,
          },
          ...activeGenres,
        ]
      : activeGenres;
  // 次アクション空白禁止ルールの対象（SV案内可能/時期見送り/失注は対象外）
  const isActiveDeal = !CLOSED_DEAL_STAGES.includes(deal.stage);

  async function markTaskDone(formData: FormData) {
    "use server";
    const taskId = String(formData.get("id"));
    await toggleTaskDone(taskId, true);
  }

  // DEAL_STAGE_ORDER 上の現在位置（nurturing / lost は -1 = 進行バーの外側）
  const stageIndex = DEAL_STAGE_ORDER.indexOf(deal.stage as DealStage);
  const isOffPath = stageIndex === -1;

  // ナーチャリング/失注に入った案件でも、履歴上どこまで正規ステージを進んだかを
  // stage_events の to_stage から逆算し、進行バーには「そこまで到達済み」を表示する
  const reachedIndices = stageEvents
    .map((e) => DEAL_STAGE_ORDER.indexOf(e.to_stage as DealStage))
    .filter((i) => i >= 0);
  const furthestIndex = reachedIndices.length > 0 ? Math.max(...reachedIndices) : 0;
  const doneUpTo = isOffPath ? furthestIndex : stageIndex;

  return (
    <div className="px-8 py-10">
      <div className="mb-6">
        <Link href="/deals" className="text-sm text-slate-500 hover:text-slate-900">
          ← 案件一覧
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{deal.title}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_BADGE_STYLE[deal.stage]}`}
          >
            {DEAL_STAGE[deal.stage]}
          </span>
        </div>
      </div>

      {secondaryError && (
        <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          一部の情報の読み込みに失敗しました（履歴・タスク・MTG・ナレッジのいずれか）。
          表示されていない項目があっても、データが消えたわけではありません: {secondaryError.message}
        </p>
      )}

      {/* 次アクション */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-500">
            次アクション{openTasks.length > 0 ? `（${openTasks.length} 件）` : ""}
          </h2>
          <span className="flex items-center gap-3">
            {/* 現ステージの雛形タスクを後から展開する（移行案件などタスク未展開の救済） */}
            <form action={applyStageTemplates}>
              <input type="hidden" name="id" value={deal.id} />
              <button
                type="submit"
                className="text-xs text-slate-500 hover:text-slate-900 hover:underline"
              >
                雛形から追加
              </button>
            </form>
            <Link
              href={`/tasks/new?deal_id=${deal.id}`}
              className="text-xs text-slate-500 hover:text-slate-900 hover:underline"
            >
              + 追加
            </Link>
          </span>
        </div>

        {openTasks.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {openTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-4 py-3 text-sm">
                <form action={markTaskDone}>
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    aria-label="完了にする"
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs text-transparent hover:border-slate-500"
                  >
                    ✓
                  </button>
                </form>
                <p className="min-w-0 flex-1 font-medium text-slate-900">{t.title}</p>
                <span className={`text-xs font-medium ${PRIORITY_STYLE[t.priority]}`}>
                  {TASK_PRIORITY[t.priority]}
                </span>
                <span className="w-24 text-right text-xs text-slate-400">
                  {t.due_date ?? "期限なし"}
                </span>
              </li>
            ))}
          </ul>
        ) : isActiveDeal ? (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">次のアクションが設定されていません。</p>
            <Link
              href={`/tasks/new?deal_id=${deal.id}`}
              className="mt-3 inline-block rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
            >
              次のアクションを設定
            </Link>
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            {DEAL_STAGE[deal.stage]}のため次アクションの設定は不要です。
          </p>
        )}
      </section>

      {/* 取引先・チャネル */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-medium text-slate-500">取引先</h2>
        <p className="mt-1 text-lg font-semibold text-slate-900">
          <Link href={`/companies/${deal.company_id}`} className="hover:underline">
            {deal.companies?.name ?? "—"}
          </Link>
        </p>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">獲得チャネル</dt>
            <dd className="mt-0.5 text-slate-900">{DEAL_CHANNEL[deal.channel]}</dd>
          </div>
          <div>
            <dt className="text-slate-400">紹介元パートナー</dt>
            <dd className="mt-0.5 text-slate-900">{deal.partners?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">ジャンル</dt>
            <dd className="mt-0.5 text-slate-900">{deal.genres?.name ?? "未設定"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">PB品の状態</dt>
            <dd className="mt-0.5 text-slate-900">
              {deal.pb_status ? PB_STATUS[deal.pb_status] : "未確認"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
          担当者（人物情報）は取引先ページで管理しています。{" "}
          <Link
            href={`/companies/${deal.company_id}`}
            className="font-medium text-slate-700 hover:underline"
          >
            {deal.companies?.name ?? "取引先"}ページを開く →
          </Link>
        </p>
      </section>

      {/* ステージ進行バー */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-medium text-slate-500">ステージ進行</h2>
        <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-3">
          {DEAL_STAGE_ORDER.map((stageKey, i) => {
            const isDone = i <= doneUpTo;
            const isCurrent = !isOffPath && i === stageIndex;
            return (
              <li key={stageKey} className="flex items-center gap-2">
                <span
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                    isCurrent
                      ? "border-slate-900 bg-white text-slate-900"
                      : isDone
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {DEAL_STAGE[stageKey]}
                </span>
                {i < DEAL_STAGE_ORDER.length - 1 && (
                  <span className="text-slate-300">→</span>
                )}
              </li>
            );
          })}
        </ol>

        {isOffPath && (
          <div
            className={`mt-4 rounded-lg px-3 py-2 text-sm font-medium ${
              deal.stage === "lost"
                ? "bg-red-50 text-red-700"
                : "bg-teal-50 text-teal-700"
            }`}
          >
            現在のステータス: {DEAL_STAGE[deal.stage]}（進行バーとは別枠管理）
          </div>
        )}

        <form
          action={changeDealStage}
          className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-5"
        >
          <input type="hidden" name="id" value={deal.id} />
          <div>
            <label htmlFor="stage" className={labelCls}>
              ステージを変更
            </label>
            <select
              id="stage"
              name="stage"
              defaultValue={deal.stage}
              className={field}
            >
              {Object.entries(DEAL_STAGE).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            変更する
          </button>
        </form>
      </section>

      {/* 案件情報の編集（ジャンル / PB品 / メモ） */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-medium text-slate-500">案件情報の編集</h2>
        <form action={updateDeal} className="space-y-4">
          <input type="hidden" name="id" value={deal.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="genre_id" className={labelCls}>
                ジャンル
              </label>
              <select
                id="genre_id"
                name="genre_id"
                defaultValue={deal.genre_id ?? ""}
                className={field}
              >
                <option value="">（未設定）</option>
                {genreOptions.map((g) => (
                  <option key={g.genre_id} value={g.genre_id}>
                    {g.name}
                    {g.contracted_count > 0 ? "（契約済・優先度低）" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pb_status" className={labelCls}>
                PB品の状態
              </label>
              <select
                id="pb_status"
                name="pb_status"
                defaultValue={deal.pb_status ?? ""}
                className={field}
              >
                <option value="">（未確認）</option>
                {Object.entries(PB_STATUS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="note" className={labelCls}>
              メモ
            </label>
            <textarea
              id="note"
              name="note"
              rows={5}
              defaultValue={deal.note ?? ""}
              className={field}
            />
          </div>
          <div>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              保存する
            </button>
          </div>
        </form>
      </section>

      {/* MTGログ（設計書§3 /deals/[id]「MTG一覧」） */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-500">MTGログ</h2>
          <Link
            href={`/meetings/new?deal_id=${deal.id}`}
            className="text-xs text-slate-500 hover:text-slate-900 hover:underline"
          >
            + MTGを記録
          </Link>
        </div>
        {meetings.length > 0 ? (
          <ul className="space-y-2">
            {meetings.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-slate-200 p-4 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{m.title}</span>
                  <span className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                      {MEETING_FORMAT[m.format]}
                    </span>
                    {m.held_on.slice(0, 10)}
                  </span>
                </div>
                {m.summary && (
                  <p className="mt-2 whitespace-pre-wrap text-slate-700">
                    {m.summary}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">MTGログなし</p>
        )}
      </section>

      {/* 関連ナレッジ */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-500">関連ナレッジ</h2>
          <Link
            href={`/meetings/new?deal_id=${deal.id}`}
            className="text-xs text-slate-500 hover:text-slate-900 hover:underline"
          >
            + MTGを記録
          </Link>
        </div>
        {relatedKnowledge.length > 0 ? (
          <ul className="space-y-3">
            {relatedKnowledge.map((k) => (
              <li key={k.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${SCENE_TAG_STYLE[k.scene_tag]}`}
                >
                  {SCENE_TAG[k.scene_tag]}
                </span>
                <p className="mt-2 font-medium text-slate-900">{k.problem}</p>
                {k.solution && (
                  <p className="mt-1 whitespace-pre-wrap text-slate-700">{k.solution}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">関連ナレッジなし</p>
        )}
      </section>

      {/* ステージ変更履歴 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-medium text-slate-500">変更履歴</h2>
        {stageEvents.length > 0 ? (
          <ol className="space-y-3">
            {stageEvents.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 text-sm">
                <span className="whitespace-nowrap text-xs text-slate-400">
                  {formatDateTimeJst(e.changed_at)}
                </span>
                <span className="text-slate-700">
                  {e.from_stage ? DEAL_STAGE[e.from_stage] : "（新規登録）"}
                  {" → "}
                  <span className="font-medium text-slate-900">
                    {DEAL_STAGE[e.to_stage]}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-400">まだ変更履歴がありません。</p>
        )}
      </section>
    </div>
  );
}
