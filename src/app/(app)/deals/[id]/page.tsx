import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { changeDealStage, updateDeal } from "../actions";
import {
  DEAL_CHANNEL,
  DEAL_STAGE,
  DEAL_STAGE_ORDER,
  type Company,
  type Deal,
  type DealStage,
  type Partner,
  type StageEvent,
} from "@/lib/types";

const STAGE_STYLE: Record<string, string> = {
  list: "bg-slate-100 text-slate-600",
  selected: "bg-slate-200 text-slate-700",
  contacting: "bg-blue-100 text-blue-700",
  meeting_set: "bg-indigo-100 text-indigo-700",
  meeting_done: "bg-violet-100 text-violet-700",
  considering: "bg-amber-100 text-amber-700",
  contract: "bg-green-100 text-green-700",
  live: "bg-emerald-100 text-emerald-700",
  nurturing: "bg-teal-100 text-teal-700",
  lost: "bg-red-100 text-red-600",
};

const field =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500";
const labelCls = "block text-sm font-medium text-slate-700";

type DealDetail = Deal & {
  companies: Pick<Company, "name"> | null;
  partners: Pick<Partner, "name"> | null;
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

  const [{ data: dealData, error: dealError }, { data: eventData }] =
    await Promise.all([
      supabase
        .from("deals")
        .select("*, companies ( name ), partners ( name )")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("stage_events")
        .select("*")
        .eq("deal_id", id)
        .order("changed_at", { ascending: false }),
    ]);

  if (dealError || !dealData) {
    notFound();
  }

  const deal = dealData as DealDetail;
  const stageEvents = (eventData ?? []) as StageEvent[];

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
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-6">
        <Link href="/deals" className="text-sm text-slate-500 hover:text-slate-900">
          ← 案件一覧
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{deal.title}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_STYLE[deal.stage]}`}
          >
            {DEAL_STAGE[deal.stage]}
          </span>
        </div>
      </div>

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
        </dl>
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

      {/* メモ */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-medium text-slate-500">メモ</h2>
        <form action={updateDeal}>
          <input type="hidden" name="id" value={deal.id} />
          <textarea
            id="note"
            name="note"
            rows={5}
            defaultValue={deal.note ?? ""}
            className={field}
          />
          <div className="mt-3">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              メモを保存
            </button>
          </div>
        </form>
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
