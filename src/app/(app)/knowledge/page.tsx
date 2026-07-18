import { KNOWLEDGE_STATUS_STYLE, SCENE_TAG_STYLE } from "@/components/badges";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { answerCard, createKnowledgeCard, publishCard, requestReview } from "./actions";
import {
  KNOWLEDGE_STATUS,
  SCENE_TAG,
  type Company,
  type Deal,
  type KnowledgeCard,
  type Meeting,
  type SceneTag,
} from "@/lib/types";

const field =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const labelCls = "block text-sm font-medium text-slate-700";

const QUEUE_STATUSES = ["open", "review_requested", "answered"] as const;

type KnowledgeRow = KnowledgeCard & {
  meetings: Pick<Meeting, "title"> | null;
  deals: Pick<Deal, "title"> | null;
  companies: Pick<Company, "name"> | null;
};

type DealOption = Pick<Deal, "id" | "title"> & {
  companies: Pick<Company, "name"> | null;
};

function tabLinkCls(active: boolean): string {
  return `border-b-2 px-4 py-2 text-sm font-medium transition ${
    active
      ? "border-brand-700 text-slate-900"
      : "border-transparent text-slate-400 hover:text-slate-700"
  }`;
}

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string | string[];
    scene_tag?: string | string[];
  }>;
}) {
  const { tab, scene_tag } = await searchParams;
  const tabValue = typeof tab === "string" ? tab : "";
  const activeTab = tabValue === "queue" ? "queue" : "published";

  const sceneTagFilter =
    typeof scene_tag === "string" && scene_tag in SCENE_TAG
      ? (scene_tag as SceneTag)
      : null;

  const supabase = await createClient();

  const selectWithRelations =
    "*, meetings ( title ), deals ( title ), companies ( name )";

  let cardsQuery =
    activeTab === "published"
      ? supabase
          .from("knowledge_cards")
          .select(selectWithRelations)
          .eq("status", "published")
          .order("published_at", { ascending: false })
      : supabase
          .from("knowledge_cards")
          .select(selectWithRelations)
          .in("status", QUEUE_STATUSES)
          .order("created_at", { ascending: true });

  if (activeTab === "published" && sceneTagFilter) {
    cardsQuery = cardsQuery.eq("scene_tag", sceneTagFilter);
  }

  const [
    { data: cardData, error: cardError },
    { count: queueCount },
    { data: companyData },
    { data: dealData },
  ] = await Promise.all([
    cardsQuery,
    supabase
      .from("knowledge_cards")
      .select("id", { count: "exact", head: true })
      .in("status", QUEUE_STATUSES),
    supabase.from("companies").select("id, name").order("name", { ascending: true }),
    supabase
      .from("deals")
      .select("*, companies ( name )")
      .order("created_at", { ascending: false }),
  ]);

  const cards = (cardData ?? []) as KnowledgeRow[];
  const companies = (companyData ?? []) as Pick<Company, "id" | "name">[];
  const deals = (dealData ?? []) as DealOption[];

  return (
    <div className="px-8 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">ナレッジ</h1>
        <p className="mt-1 text-sm text-slate-500">
          現場の困りごと → 山路確認 → ナレッジ公開
        </p>
      </header>

      {cardError && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          読み込みエラー: {cardError.message}
          （マイグレーション未実行の可能性があります）
        </p>
      )}

      <nav className="mb-6 flex gap-2 border-b border-slate-200">
        <Link href="/knowledge?tab=published" className={tabLinkCls(activeTab === "published")}>
          公開ナレッジ
        </Link>
        <Link href="/knowledge?tab=queue" className={tabLinkCls(activeTab === "queue")}>
          確認キュー{(queueCount ?? 0) > 0 ? `（${queueCount}）` : ""}
        </Link>
      </nav>

      {activeTab === "published" ? (
        <>
          <form method="get" className="mb-4 flex items-center gap-3">
            <input type="hidden" name="tab" value="published" />
            <label htmlFor="scene_tag" className="text-sm font-medium text-slate-700">
              場面タグ
            </label>
            <select
              id="scene_tag"
              name="scene_tag"
              defaultValue={sceneTagFilter ?? ""}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              <option value="">すべて</option>
              {Object.entries(SCENE_TAG).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              絞り込む
            </button>
          </form>

          {cards.length > 0 ? (
            <ul className="space-y-4">
              {cards.map((c) => (
                <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${SCENE_TAG_STYLE[c.scene_tag]}`}
                    >
                      {SCENE_TAG[c.scene_tag]}
                    </span>
                    {c.published_at && (
                      <span className="text-xs text-slate-400">
                        {c.published_at.slice(0, 10)} 公開
                      </span>
                    )}
                  </div>
                  <p className="mt-3 font-medium text-slate-900">{c.problem}</p>
                  {c.solution && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {c.solution}
                    </p>
                  )}
                  {(c.deal_id || c.company_id) && (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                      {c.deal_id && (
                        <Link href={`/deals/${c.deal_id}`} className="hover:underline">
                          {c.deals?.title ?? "案件"}
                        </Link>
                      )}
                      {c.company_id && !c.deal_id && (
                        <Link
                          href={`/companies/${c.company_id}`}
                          className="hover:underline"
                        >
                          {c.companies?.name ?? "取引先"}
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400">
              {sceneTagFilter
                ? "このタグの公開ナレッジはありません。"
                : "まだ公開されたナレッジがありません。"}
            </p>
          )}
        </>
      ) : (
        <>
          {cards.length > 0 ? (
            <ul className="space-y-4">
              {cards.map((c) => (
                <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${SCENE_TAG_STYLE[c.scene_tag]}`}
                    >
                      {SCENE_TAG[c.scene_tag]}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${KNOWLEDGE_STATUS_STYLE[c.status]}`}
                    >
                      {KNOWLEDGE_STATUS[c.status]}
                    </span>
                    <span className="text-xs text-slate-400">
                      {c.created_at.slice(0, 10)}
                    </span>
                  </div>
                  <p className="mt-3 font-medium text-slate-900">{c.problem}</p>
                  {(c.meeting_id || c.deal_id || c.company_id) && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                      {c.meeting_id && <span>MTG: {c.meetings?.title ?? "—"}</span>}
                      {c.deal_id && (
                        <Link href={`/deals/${c.deal_id}`} className="hover:underline">
                          {c.deals?.title ?? "案件"}
                        </Link>
                      )}
                      {c.company_id && !c.deal_id && (
                        <Link
                          href={`/companies/${c.company_id}`}
                          className="hover:underline"
                        >
                          {c.companies?.name ?? "取引先"}
                        </Link>
                      )}
                    </div>
                  )}

                  {c.status === "open" && (
                    <form action={requestReview} className="mt-4">
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-800"
                      >
                        山路に確認
                      </button>
                    </form>
                  )}

                  {c.status === "review_requested" && (
                    <form action={answerCard} className="mt-4 space-y-2">
                      <input type="hidden" name="id" value={c.id} />
                      <label
                        htmlFor={`solution_${c.id}`}
                        className="block text-xs font-medium text-slate-700"
                      >
                        回答
                      </label>
                      <textarea
                        id={`solution_${c.id}`}
                        name="solution"
                        rows={2}
                        required
                        className={field}
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-800"
                      >
                        回答する
                      </button>
                    </form>
                  )}

                  {c.status === "answered" && (
                    <div className="mt-4 space-y-2">
                      {c.solution && (
                        <p className="whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          {c.solution}
                        </p>
                      )}
                      <form action={publishCard}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-700"
                        >
                          公開する
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400">
              確認待ちのナレッジはありません。
            </p>
          )}

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-medium text-slate-500">困りごとを直接登録</h2>
            <form action={createKnowledgeCard} className="space-y-5">
              <div>
                <label htmlFor="scene_tag_new" className={labelCls}>
                  場面タグ <span className="text-red-500">*</span>
                </label>
                <select
                  id="scene_tag_new"
                  name="scene_tag"
                  required
                  defaultValue=""
                  className={field}
                >
                  <option value="">（選択してください）</option>
                  {Object.entries(SCENE_TAG).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="problem_new" className={labelCls}>
                  困りごとの内容 <span className="text-red-500">*</span>
                </label>
                <textarea id="problem_new" name="problem" rows={3} required className={field} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="deal_id_new" className={labelCls}>
                    関連する案件 <span className="font-normal text-slate-400">任意</span>
                  </label>
                  <select id="deal_id_new" name="deal_id" defaultValue="" className={field}>
                    <option value="">（なし）</option>
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.companies?.name ? `${d.companies.name} / ${d.title}` : d.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="company_id_new" className={labelCls}>
                    関連する取引先 <span className="font-normal text-slate-400">任意</span>
                  </label>
                  <select id="company_id_new" name="company_id" defaultValue="" className={field}>
                    <option value="">（なし）</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-800"
                >
                  登録する
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
