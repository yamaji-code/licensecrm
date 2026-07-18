import { KNOWLEDGE_STATUS_STYLE, SCENE_TAG_STYLE } from "@/components/badges";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { answerCard, createKnowledgeCard, publishCard, requestReview } from "./actions";
import {
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  FormActions,
  LoadErrorBanner,
  PageHeader,
  PageShell,
  Segmented,
  Select,
  SubmitButton,
  Textarea,
} from "@/components/ui";
import {
  KNOWLEDGE_STATUS,
  SCENE_TAG,
  type Company,
  type Deal,
  type KnowledgeCard,
  type Meeting,
  type SceneTag,
} from "@/lib/types";

const QUEUE_STATUSES = ["open", "review_requested", "answered"] as const;

type KnowledgeRow = KnowledgeCard & {
  meetings: Pick<Meeting, "title"> | null;
  deals: Pick<Deal, "title"> | null;
  companies: Pick<Company, "name"> | null;
};

type DealOption = Pick<Deal, "id" | "title"> & {
  companies: Pick<Company, "name"> | null;
};

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
    <PageShell>
      <PageHeader
        title="ナレッジ"
        description="現場の困りごと → 山路確認 → ナレッジ公開"
      />

      {cardError && (
        <div className="mb-4">
          <LoadErrorBanner
            message={`${cardError.message}（マイグレーション未実行の可能性があります）`}
          />
        </div>
      )}

      {/* 表示の切り替え。リンク先は従来のタブと同じURL（?tab=...）なので挙動は変わらない */}
      <div className="mb-6">
        <Segmented
          label="ナレッジの表示"
          active={activeTab}
          options={[
            {
              value: "published",
              label: "公開ナレッジ",
              href: "/knowledge?tab=published",
            },
            {
              value: "queue",
              label: `確認キュー${(queueCount ?? 0) > 0 ? `（${queueCount}）` : ""}`,
              href: "/knowledge?tab=queue",
            },
          ]}
        />
      </div>

      {activeTab === "published" ? (
        <>
          <Card className="mb-4">
            <CardBody>
              <form method="get" className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="tab" value="published" />
                <div className="w-full sm:w-64">
                  <Field htmlFor="scene_tag" label="場面タグ">
                    <Select
                      id="scene_tag"
                      name="scene_tag"
                      defaultValue={sceneTagFilter ?? ""}
                    >
                      <option value="">すべて</option>
                      {Object.entries(SCENE_TAG).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <SubmitButton variant="secondary">絞り込む</SubmitButton>
              </form>
            </CardBody>
          </Card>

          {cards.length > 0 ? (
            <ul className="space-y-3">
              {cards.map((c) => (
                <li key={c.id}>
                  <Card>
                    <CardBody>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${SCENE_TAG_STYLE[c.scene_tag]}`}
                        >
                          {SCENE_TAG[c.scene_tag]}
                        </span>
                        {c.published_at && (
                          <span className="text-xs text-ink-faint">
                            {c.published_at.slice(0, 10)} 公開
                          </span>
                        )}
                      </div>
                      <p className="mt-3 font-medium text-ink">{c.problem}</p>
                      {c.solution && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">
                          {c.solution}
                        </p>
                      )}
                      {(c.deal_id || c.company_id) && (
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-faint">
                          {c.deal_id && (
                            <Link
                              href={`/deals/${c.deal_id}`}
                              className="hover:text-brand-700 hover:underline"
                            >
                              {c.deals?.title ?? "案件"}
                            </Link>
                          )}
                          {c.company_id && !c.deal_id && (
                            <Link
                              href={`/companies/${c.company_id}`}
                              className="hover:text-brand-700 hover:underline"
                            >
                              {c.companies?.name ?? "取引先"}
                            </Link>
                          )}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <Card>
              <EmptyState
                title={
                  sceneTagFilter
                    ? "このタグの公開ナレッジはまだありません"
                    : "まだ公開されたナレッジがありません"
                }
                description={
                  sceneTagFilter
                    ? "別の場面タグに切り替えるか、確認キューで回答済みのものを公開してください。"
                    : "確認キューに上がった困りごとに山路さんが回答し、公開すると、ここに並びます。"
                }
                action={
                  <ButtonLink
                    href="/knowledge?tab=queue"
                    variant="primary"
                    size="sm"
                  >
                    確認キューを見る
                  </ButtonLink>
                }
              />
            </Card>
          )}
        </>
      ) : (
        <>
          {cards.length > 0 ? (
            <ul className="space-y-3">
              {cards.map((c) => (
                <li key={c.id}>
                  <Card>
                    <CardBody>
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
                        <span className="text-xs text-ink-faint">
                          {c.created_at.slice(0, 10)}
                        </span>
                      </div>
                      <p className="mt-3 font-medium text-ink">{c.problem}</p>
                      {(c.meeting_id || c.deal_id || c.company_id) && (
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-faint">
                          {c.meeting_id && (
                            <span>MTG: {c.meetings?.title ?? "—"}</span>
                          )}
                          {c.deal_id && (
                            <Link
                              href={`/deals/${c.deal_id}`}
                              className="hover:text-brand-700 hover:underline"
                            >
                              {c.deals?.title ?? "案件"}
                            </Link>
                          )}
                          {c.company_id && !c.deal_id && (
                            <Link
                              href={`/companies/${c.company_id}`}
                              className="hover:text-brand-700 hover:underline"
                            >
                              {c.companies?.name ?? "取引先"}
                            </Link>
                          )}
                        </div>
                      )}

                      {c.status === "open" && (
                        <form action={requestReview} className="mt-4">
                          <input type="hidden" name="id" value={c.id} />
                          <SubmitButton size="sm" pendingLabel="依頼中…">
                            山路に確認
                          </SubmitButton>
                        </form>
                      )}

                      {c.status === "review_requested" && (
                        <form action={answerCard} className="mt-4 space-y-3">
                          <input type="hidden" name="id" value={c.id} />
                          <Field
                            htmlFor={`solution_${c.id}`}
                            label="回答"
                            required
                          >
                            <Textarea
                              id={`solution_${c.id}`}
                              name="solution"
                              rows={2}
                              required
                            />
                          </Field>
                          <SubmitButton size="sm" pendingLabel="登録中…">
                            回答する
                          </SubmitButton>
                        </form>
                      )}

                      {c.status === "answered" && (
                        <div className="mt-4 space-y-3">
                          {c.solution && (
                            <p className="whitespace-pre-wrap rounded-lg bg-surface px-3 py-2 text-sm text-ink-soft">
                              {c.solution}
                            </p>
                          )}
                          <form action={publishCard}>
                            <input type="hidden" name="id" value={c.id} />
                            <SubmitButton size="sm" pendingLabel="公開中…">
                              公開する
                            </SubmitButton>
                          </form>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <Card>
              <EmptyState
                title="まだ確認待ちの困りごとがありません"
                description="判断に迷ったことが出たら、下のフォームから登録してください。山路さんが回答すると、次に同じ場面が来たとき案件画面に自動で表示されます。"
              />
            </Card>
          )}

          <div className="mt-6">
            <Card>
              <CardHeader title="困りごとを直接登録" />
              <CardBody>
                <form action={createKnowledgeCard} className="space-y-5">
                  <Field htmlFor="scene_tag_new" label="場面タグ" required>
                    <Select
                      id="scene_tag_new"
                      name="scene_tag"
                      required
                      defaultValue=""
                    >
                      <option value="">（選択してください）</option>
                      {Object.entries(SCENE_TAG).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field htmlFor="problem_new" label="困りごとの内容" required>
                    <Textarea
                      id="problem_new"
                      name="problem"
                      rows={3}
                      required
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field htmlFor="deal_id_new" label="関連する案件">
                      <Select id="deal_id_new" name="deal_id" defaultValue="">
                        <option value="">（なし）</option>
                        {deals.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.companies?.name
                              ? `${d.companies.name} / ${d.title}`
                              : d.title}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field htmlFor="company_id_new" label="関連する取引先">
                      <Select
                        id="company_id_new"
                        name="company_id"
                        defaultValue=""
                      >
                        <option value="">（なし）</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <FormActions>
                    <SubmitButton pendingLabel="登録中…">登録する</SubmitButton>
                  </FormActions>
                </form>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </PageShell>
  );
}
