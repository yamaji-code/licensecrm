import {
  MEETING_FORMAT_STYLE,
  SCENE_TAG_STYLE,
  TASK_PRIORITY_STYLE,
} from "@/components/badges";
import Link from "next/link";
import { STAGE_BADGE_STYLE } from "@/components/stage-badge";
import { MarkdownContent } from "@/components/markdown-content";
import { displayDealTitle } from "../board-card";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { jstDateString } from "@/lib/date";
import {
  addDealContactEntry,
  applyStageTemplates,
  changeDealStage,
  deleteDealContactEntry,
  updateDeal,
  updateDealChannel,
  updateDealContactEntry,
  updateDealGenre,
} from "../actions";
import { updateCompanyDetails } from "../../companies/actions";
import {
  quickAddNextAction,
  toggleTaskDone,
  updateTask,
} from "../../tasks/actions";
import {
  Banner,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  PageHeader,
  PageShell,
  Select,
  SubmitButton,
  Textarea,
} from "@/components/ui";
import {
  CLOSED_DEAL_STAGES,
  compareTaskPriorityThenDueDate,
  DEAL_CHANNEL,
  DEAL_STAGE,
  DEAL_STAGE_ORDER,
  MEETING_FORMAT,
  PB_STATUS,
  SCENE_TAG,
  TASK_PRIORITY,
  TASK_STATUS,
  TIER,
  type Company,
  type Deal,
  type DealChannel,
  type DealContactEntry,
  type DealStage,
  type KnowledgeCard,
  type Meeting,
  type StageEvent,
  type Task,
} from "@/lib/types";

type DealDetail = Deal & {
  companies:
    | Pick<
        Company,
        | "name"
        | "target_brand"
        | "tier"
        | "website"
        | "lead_source"
        | "parent_company"
      >
    | null;
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { id } = await params;
  const { view } = await searchParams;
  const showDone = (Array.isArray(view) ? view[0] : view) === "done";

  const supabase = await createClient();

  const [
    { data: dealData, error: dealError },
    { data: eventData, error: eventError },
    { data: taskData, error: taskError },
    { data: meetingData, error: meetingError },
    { data: knowledgeData, error: knowledgeError },
    { data: genreStatData, error: genreStatError },
    { count: doneTaskCount },
    { data: dealContactEntryData },
  ] = await Promise.all([
    supabase
      .from("deals")
      .select(
        `*, companies (
          name, target_brand, tier, website, lead_source, parent_company
        ), genres ( name )`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("stage_events")
      .select("*")
      .eq("deal_id", id)
      .order("changed_at", { ascending: false }),
    showDone
      ? supabase
          .from("tasks")
          .select("*")
          .eq("deal_id", id)
          .eq("status", "done")
          .order("updated_at", { ascending: false })
      : supabase
          .from("tasks")
          .select("*")
          .eq("deal_id", id)
          .neq("status", "done"),
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
    // 開いている一覧側にだけ出す「完了」リンクの件数
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("deal_id", id)
      .eq("status", "done"),
    // 担当者カード: 案件専用の自由入力担当者（取引先の登録済みcontactsとは独立）
    supabase
      .from("deal_contact_entries")
      .select("*")
      .eq("deal_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (dealError || !dealData) {
    notFound();
  }

  // 副次クエリの読み取り失敗は、履歴やMTGが「無い」ように見せず障害として明示する
  // （空表示との誤認を防ぐ。RLS拒否は空配列を返すためここには乗らない）
  const secondaryError =
    eventError ?? taskError ?? meetingError ?? knowledgeError ?? genreStatError;

  const deal = dealData as DealDetail;
  const dealContactEntries = (dealContactEntryData ?? []) as DealContactEntry[];
  const stageEvents = (eventData ?? []) as StageEvent[];
  // 優先度が高い順→期日が古い順（完了済み一覧は更新日時順のためここでは並べ替えない）
  const openTasks = showDone
    ? ((taskData ?? []) as Task[])
    : ((taskData ?? []) as Task[]).toSorted(compareTaskPriorityThenDueDate);
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
    const done = formData.get("done") === "true";
    await toggleTaskDone(taskId, done);
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
    <PageShell>
      <PageHeader
        // 会社名は右レールに出るので、案件名側の重複（移行データ由来）は畳む
        title={displayDealTitle(deal.title, deal.companies?.name)}
        meta={
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_BADGE_STYLE[deal.stage]}`}
          >
            {DEAL_STAGE[deal.stage]}
          </span>
        }
        back={
          <Link
            href="/deals"
            className="text-ink-soft hover:text-brand-700 hover:underline"
          >
            ← 案件一覧
          </Link>
        }
      />

      {secondaryError && (
        <div className="mb-6">
          <Banner tone="warn" title="一部の情報を読み込めませんでした">
            履歴・タスク・MTG・ナレッジのいずれかが表示できていません。
            表示されていない項目があっても、データが消えたわけではありません: {secondaryError.message}
          </Banner>
        </div>
      )}

      {/*
        広い画面は2カラム。左（メイン）に「これから動かす」情報、右（レール）に
        「参照するだけ」の属性を置く。狭い画面では従来どおりメイン→レールの縦積み。
      */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* 次アクション（この案件で最初に読む情報なのでファーストビューの先頭に置く） */}
          <Card>
            <CardHeader
              title={
                showDone
                  ? `完了したnext action${openTasks.length > 0 ? `（${openTasks.length} 件）` : ""}`
                  : `next action${openTasks.length > 0 ? `（${openTasks.length} 件）` : ""}`
              }
              actions={
                showDone ? (
                  <ButtonLink
                    href={`/deals/${deal.id}`}
                    variant="secondary"
                    size="sm"
                  >
                    ← next actionに戻る
                  </ButtonLink>
                ) : (
                  <>
                    {/* 現ステージの雛形タスクを後から展開する（移行案件などタスク未展開の救済） */}
                    <form action={applyStageTemplates}>
                      <input type="hidden" name="id" value={deal.id} />
                      <SubmitButton
                        variant="ghost"
                        size="sm"
                        pendingLabel="追加中…"
                      >
                        雛形から追加
                      </SubmitButton>
                    </form>
                    <ButtonLink
                      href={`/tasks/new?deal_id=${deal.id}`}
                      variant="secondary"
                      size="sm"
                    >
                      タスクを追加
                    </ButtonLink>
                    <ButtonLink
                      href={`/deals/${deal.id}?view=done`}
                      variant="ghost"
                      size="sm"
                    >
                      完了（{doneTaskCount ?? 0}件）
                    </ButtonLink>
                  </>
                )
              }
            />
            {isActiveDeal && !showDone && (
              <CardBody className="space-y-2 border-b border-line py-3">
                {/* next action のワンタッチ追記。期限は自動で+7日を入れておくので
                    そのままでも登録できる（変更も可能） */}
                <form action={quickAddNextAction} className="space-y-2">
                  <input type="hidden" name="deal_id" value={deal.id} />
                  <div className="flex items-center gap-2">
                    <Input
                      name="title"
                      placeholder="next actionを追記…"
                      className="flex-1"
                      required
                    />
                    <SubmitButton size="sm" pendingLabel="追加中…">
                      追加
                    </SubmitButton>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      name="priority"
                      defaultValue="medium"
                      className="w-24"
                    >
                      {Object.entries(TASK_PRIORITY).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <Select name="status" defaultValue="todo" className="w-28">
                      {Object.entries(TASK_STATUS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <Input
                      name="due_date"
                      type="date"
                      defaultValue={jstDateString(7)}
                      className="w-40"
                    />
                  </div>
                  <Textarea name="note" placeholder="メモ" rows={2} />
                </form>
              </CardBody>
            )}
            {openTasks.length > 0 ? (
              <CardBody className="py-0">
                <ul className="divide-y divide-line">
                  {openTasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-sm"
                    >
                      <form action={markTaskDone}>
                        <input type="hidden" name="id" value={t.id} />
                        <input
                          type="hidden"
                          name="done"
                          value={showDone ? "false" : "true"}
                        />
                        {/* 見た目の丸は小さいまま、タップ判定は 40px 角を確保する */}
                        <button
                          type="submit"
                          aria-label={
                            showDone
                              ? `「${t.title}」を未完了に戻す`
                              : `「${t.title}」を完了にする`
                          }
                          aria-pressed={showDone}
                          className="group -m-2 flex h-10 w-10 items-center justify-center p-2"
                        >
                          <span
                            aria-hidden="true"
                            className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors ${
                              showDone
                                ? "border-ok bg-ok text-white"
                                : "border-line text-transparent group-hover:border-brand-500 group-hover:text-brand-700"
                            }`}
                          >
                            ✓
                          </span>
                        </button>
                      </form>
                      <div className="min-w-0 flex-1">
                        {/* タイトル・メモは常時表示、編集フォームは「編集」を押すまで出さない（ごちゃつき防止） */}
                        <p
                          className={
                            showDone
                              ? "font-medium text-ink-faint line-through"
                              : "font-medium text-ink"
                          }
                        >
                          {t.title}
                        </p>
                        {t.note && (
                          <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-line bg-surface px-2.5 py-2 text-xs text-ink-soft">
                            {t.note}
                          </p>
                        )}
                        <details className="mt-1 [&_summary::-webkit-details-marker]:hidden">
                          <summary className="cursor-pointer list-none text-xs text-brand-700 hover:underline">
                            編集
                          </summary>
                          <form action={updateTask} className="mt-2 space-y-2">
                            <input type="hidden" name="id" value={t.id} />
                            <Input name="title" defaultValue={t.title} required />
                            <div className="flex flex-wrap items-center gap-2">
                              <Select
                                name="priority"
                                defaultValue={t.priority}
                                className="w-24"
                              >
                                {Object.entries(TASK_PRIORITY).map(
                                  ([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ),
                                )}
                              </Select>
                              <Select
                                name="status"
                                defaultValue={t.status}
                                className="w-28"
                              >
                                {Object.entries(TASK_STATUS).map(
                                  ([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ),
                                )}
                              </Select>
                              <Input
                                name="due_date"
                                type="date"
                                defaultValue={t.due_date ?? ""}
                                className="w-40"
                              />
                            </div>
                            <Textarea
                              name="note"
                              defaultValue={t.note ?? ""}
                              placeholder="メモ"
                              rows={2}
                            />
                            <SubmitButton size="sm" pendingLabel="保存中…">
                              保存
                            </SubmitButton>
                          </form>
                        </details>
                      </div>
                      <span
                        className={`text-xs font-medium ${TASK_PRIORITY_STYLE[t.priority]}`}
                      >
                        {TASK_PRIORITY[t.priority]}
                      </span>
                      <span className="w-24 text-right text-xs text-ink-faint">
                        {t.due_date ?? "期限なし"}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            ) : showDone ? (
              <EmptyState
                title="まだ完了したnext actionがありません"
                description="next actionを完了にすると、ここに並びます。"
              />
            ) : isActiveDeal ? (
              <CardBody>
                <Banner
                  // 赤は期限切れ・取り消せない操作・読み込み失敗だけに使う。
                  // 未設定はボード/ダッシュボードでも注意色なので合わせる
                  tone="warn"
                  title="次のアクションが設定されていません"
                  actions={
                    <ButtonLink
                      href={`/tasks/new?deal_id=${deal.id}`}
                      variant="primary"
                      size="sm"
                    >
                      次のアクションを設定
                    </ButtonLink>
                  }
                >
                  進行中の案件は次にやることを1つ以上置いておきます。
                </Banner>
              </CardBody>
            ) : (
              <EmptyState
                title="next actionの設定は不要です"
                description={`${DEAL_STAGE[deal.stage]}の案件のため、next actionが空でも問題ありません。`}
              />
            )}
          </Card>

          {/* ステージ進行 */}
          <Card>
            <CardHeader title="ステージ進行" />
            <CardBody className="space-y-5">
              {/* 狭い画面では折り返す（横に潰してラベルを読めなくしない） */}
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
                {DEAL_STAGE_ORDER.map((stageKey, i) => {
                  const isDone = i <= doneUpTo;
                  const isCurrent = !isOffPath && i === stageIndex;
                  return (
                    <li key={stageKey} className="flex items-center gap-2">
                      <span
                        aria-current={isCurrent ? "step" : undefined}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                          isCurrent
                            ? "border-brand-700 bg-white text-ink"
                            : isDone
                              ? "border-brand-700 bg-brand-700 text-white"
                              : "border-line bg-white text-ink-faint"
                        }`}
                      >
                        {DEAL_STAGE[stageKey]}
                      </span>
                      {i < DEAL_STAGE_ORDER.length - 1 && (
                        <span aria-hidden="true" className="text-ink-faint">
                          →
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>

              {isOffPath && (
                <Banner
                  tone={
                    deal.stage === "lost" || deal.stage === "lost_after_proposal"
                      ? "warn"
                      : "info"
                  }
                  title={`現在のステータス: ${DEAL_STAGE[deal.stage]}`}
                >
                  進行バーとは別枠で管理しています。
                </Banner>
              )}

              <form
                action={changeDealStage}
                className="flex flex-wrap items-end gap-3 border-t border-line pt-5"
              >
                <input type="hidden" name="id" value={deal.id} />
                <div className="min-w-56 flex-1">
                  <Field htmlFor="stage" label="ステージを変更">
                    <Select id="stage" name="stage" defaultValue={deal.stage}>
                      {Object.entries(DEAL_STAGE).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <SubmitButton pendingLabel="変更中…">変更する</SubmitButton>
              </form>
            </CardBody>
          </Card>

          {/* MTGログ（設計書§3 /deals/[id]「MTG一覧」） */}
          <Card>
            <CardHeader
              title="MTG LOG"
              actions={
                <ButtonLink
                  href={`/meetings/new?deal_id=${deal.id}`}
                  variant="secondary"
                  size="sm"
                >
                  MTGを記録
                </ButtonLink>
              }
            />
            {meetings.length > 0 ? (
              <CardBody>
                <ul className="space-y-2">
                  {meetings.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-card border border-line px-4 py-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-ink">{m.title}</span>
                        <span className="flex items-center gap-2 text-xs text-ink-soft">
                          <span
                            className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                              MEETING_FORMAT_STYLE[m.format]
                            }`}
                          >
                            {MEETING_FORMAT[m.format]}
                          </span>
                          {m.held_on.slice(0, 10)}
                          <Link
                            href={`/meetings/${m.id}/edit`}
                            className="text-brand-700 hover:underline"
                          >
                            編集
                          </Link>
                        </span>
                      </div>
                      {m.summary && (
                        <div className="mt-2">
                          <MarkdownContent content={m.summary} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </CardBody>
            ) : (
              <EmptyState
                title="まだMTG LOGがありません"
                description="商談や打ち合わせを記録すると、次に何を話すかをこの案件だけで追えます。"
                action={
                  <ButtonLink
                    href={`/meetings/new?deal_id=${deal.id}`}
                    variant="primary"
                    size="sm"
                  >
                    最初のMTGを記録
                  </ButtonLink>
                }
              />
            )}
          </Card>

          {/* ステージ変更履歴 */}
          <Card>
            <CardHeader title="変更履歴" />
            {stageEvents.length > 0 ? (
              <CardBody>
                <ol className="space-y-3">
                  {stageEvents.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-baseline gap-x-3 text-sm"
                    >
                      <span className="whitespace-nowrap text-xs text-ink-faint">
                        {formatDateTimeJst(e.changed_at)}
                      </span>
                      <span className="text-ink-soft">
                        {e.from_stage ? DEAL_STAGE[e.from_stage] : "（新規登録）"}
                        {" → "}
                        <span className="font-medium text-ink">
                          {DEAL_STAGE[e.to_stage]}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </CardBody>
            ) : (
              <EmptyState
                title="まだ変更履歴がありません"
                description="ステージを変更すると、いつどこへ動いたかがここに残ります。"
              />
            )}
          </Card>
        </div>

        {/* 右レール: 参照するだけの属性と関連情報 */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader
              title="取引先"
              actions={
                <ButtonLink
                  href={`/companies/${deal.company_id}`}
                  variant="ghost"
                  size="sm"
                >
                  ページを開く
                </ButtonLink>
              }
            />
            <CardBody className="space-y-4">
              {/* 取引先カード: 会社名・ターゲットブランド・法人URL・tier・リード創出・親会社は
                  companies テーブルなのでまとめて1フォームで保存する。
                  獲得チャネル・ジャンルは deals テーブルの項目のため、それぞれ単独で
                  保存できる小さなフォームにしている（1フォームで全部を上書きすると
                  他の案件属性まで巻き込んで消してしまうため）。
                  並び順はサヤカさん指定（会社名→ターゲットブランド→法人URL→tier→
                  獲得チャネル→リード創出→ジャンル→親会社）。紹介元パートナーは削除済み。 */}
              <form action={updateCompanyDetails} className="space-y-4">
                <input type="hidden" name="id" value={deal.company_id} />
                <input type="hidden" name="deal_id" value={deal.id} />
                <Field htmlFor="name" label="会社名" required>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={deal.companies?.name ?? ""}
                    required
                  />
                </Field>
                <Field htmlFor="target_brand" label="ターゲットブランド">
                  <Input
                    id="target_brand"
                    name="target_brand"
                    defaultValue={deal.companies?.target_brand ?? ""}
                  />
                </Field>
                <Field htmlFor="website" label="法人URL">
                  <Input
                    id="website"
                    name="website"
                    defaultValue={deal.companies?.website ?? ""}
                    placeholder="https://"
                  />
                </Field>
                <Field htmlFor="tier" label="tier">
                  <Select
                    id="tier"
                    name="tier"
                    defaultValue={deal.companies?.tier ?? ""}
                  >
                    <option value="">未設定</option>
                    {Object.entries(TIER).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field htmlFor="lead_source" label="リード創出">
                  <Input
                    id="lead_source"
                    name="lead_source"
                    defaultValue={deal.companies?.lead_source ?? ""}
                  />
                </Field>
                <Field htmlFor="parent_company" label="親会社">
                  <Input
                    id="parent_company"
                    name="parent_company"
                    defaultValue={deal.companies?.parent_company ?? ""}
                  />
                </Field>
                <SubmitButton variant="secondary" size="sm" pendingLabel="保存中…">
                  保存
                </SubmitButton>
              </form>

              <form
                action={updateDealChannel}
                className="space-y-2 border-t border-line pt-4"
              >
                <input type="hidden" name="id" value={deal.id} />
                <fieldset className="space-y-1.5">
                  <legend className="text-sm font-medium text-ink">
                    獲得チャネル
                  </legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {Object.entries(DEAL_CHANNEL).map(([value, label]) => (
                      <label
                        key={value}
                        className="flex items-center gap-1.5 text-sm text-ink"
                      >
                        <input
                          type="checkbox"
                          name="channel"
                          value={value}
                          defaultChecked={deal.channel.includes(
                            value as DealChannel,
                          )}
                          className="h-4 w-4 rounded border-line"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <SubmitButton variant="secondary" size="sm" pendingLabel="保存中…">
                  保存
                </SubmitButton>
              </form>

              <form
                action={updateDealGenre}
                className="flex items-end gap-2 border-t border-line pt-4"
              >
                <input type="hidden" name="id" value={deal.id} />
                <div className="flex-1">
                  <Field htmlFor="genre_id_company_card" label="ジャンル">
                    <Select
                      id="genre_id_company_card"
                      name="genre_id"
                      defaultValue={deal.genre_id ?? ""}
                    >
                      <option value="">（未設定）</option>
                      {genreOptions.map((g) => (
                        <option key={g.genre_id} value={g.genre_id}>
                          {g.name}
                          {g.contracted_count > 0 ? "（契約済・優先度低）" : ""}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <SubmitButton variant="secondary" size="sm" pendingLabel="保存中…">
                  保存
                </SubmitButton>
              </form>
            </CardBody>
          </Card>

          {/* 担当者カード: 案件専用の自由入力担当者（取引先の登録済みcontactsとは独立） */}
          <Card>
            <CardHeader title={`担当者（${dealContactEntries.length}名）`} />
            <CardBody className="space-y-4">
              {dealContactEntries.length > 0 && (
                <ul className="space-y-3">
                  {dealContactEntries.map((c) => (
                    <li key={c.id} className="rounded-lg border border-line p-3">
                      <form action={updateDealContactEntry} className="space-y-2">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="deal_id" value={deal.id} />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input
                            name="name"
                            defaultValue={c.name}
                            placeholder="名前"
                            required
                          />
                          <Input
                            name="title"
                            defaultValue={c.title ?? ""}
                            placeholder="役職"
                          />
                          <Input
                            name="phone"
                            defaultValue={c.phone ?? ""}
                            placeholder="電話"
                          />
                          <Input
                            name="email"
                            type="email"
                            defaultValue={c.email ?? ""}
                            placeholder="メール"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <SubmitButton
                            variant="secondary"
                            size="sm"
                            pendingLabel="保存中…"
                          >
                            保存
                          </SubmitButton>
                        </div>
                      </form>
                      <form action={deleteDealContactEntry} className="mt-1.5">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="deal_id" value={deal.id} />
                        <SubmitButton variant="ghost" size="sm" pendingLabel="削除中…">
                          削除
                        </SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              {dealContactEntries.length === 0 && (
                <p className="text-xs text-ink-soft">
                  まだ担当者が登録されていません。下のフォームから追加できます。
                </p>
              )}

              <form
                action={addDealContactEntry}
                className="space-y-2 border-t border-line pt-4"
              >
                <input type="hidden" name="deal_id" value={deal.id} />
                <p className="text-sm font-medium text-ink">担当者を追加</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input name="name" placeholder="名前" required />
                  <Input name="title" placeholder="役職" />
                  <Input name="phone" placeholder="電話" />
                  <Input name="email" type="email" placeholder="メール" />
                </div>
                <SubmitButton variant="secondary" size="sm" pendingLabel="追加中…">
                  追加する
                </SubmitButton>
              </form>
            </CardBody>
          </Card>

          {/* 案件情報の編集（ジャンル / PB品 / メモ）＝上の属性を直す場所なのでレール側に置く */}
          <Card>
            <CardHeader title="案件情報の編集" />
            <CardBody>
              <form action={updateDeal} className="space-y-4">
                <input type="hidden" name="id" value={deal.id} />
                <Field htmlFor="title" label="案件名" required>
                  <Input id="title" name="title" defaultValue={deal.title} required />
                </Field>
                <Field htmlFor="genre_id" label="ジャンル">
                  <Select
                    id="genre_id"
                    name="genre_id"
                    defaultValue={deal.genre_id ?? ""}
                  >
                    <option value="">（未設定）</option>
                    {genreOptions.map((g) => (
                      <option key={g.genre_id} value={g.genre_id}>
                        {g.name}
                        {g.contracted_count > 0 ? "（契約済・優先度低）" : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field htmlFor="pb_status" label="PB品の状態">
                  <Select
                    id="pb_status"
                    name="pb_status"
                    defaultValue={deal.pb_status ?? ""}
                  >
                    <option value="">（未確認）</option>
                    {Object.entries(PB_STATUS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field htmlFor="note" label="メモ">
                  <Textarea
                    id="note"
                    name="note"
                    rows={5}
                    defaultValue={deal.note ?? ""}
                  />
                </Field>
                <SubmitButton pendingLabel="保存中…">保存する</SubmitButton>
              </form>
            </CardBody>
          </Card>

          {/* 関連ナレッジ */}
          <Card>
            <CardHeader
              title="関連ナレッジ"
              actions={
                <ButtonLink
                  href={`/meetings/new?deal_id=${deal.id}`}
                  variant="ghost"
                  size="sm"
                >
                  MTGを記録
                </ButtonLink>
              }
            />
            {relatedKnowledge.length > 0 ? (
              <CardBody>
                <ul className="space-y-3">
                  {relatedKnowledge.map((k) => (
                    <li
                      key={k.id}
                      className="rounded-card border border-line px-4 py-3 text-sm"
                    >
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${SCENE_TAG_STYLE[k.scene_tag]}`}
                      >
                        {SCENE_TAG[k.scene_tag]}
                      </span>
                      <p className="mt-2 font-medium text-ink">{k.problem}</p>
                      {k.solution && (
                        <p className="mt-1 whitespace-pre-wrap text-ink-soft">
                          {k.solution}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardBody>
            ) : (
              <EmptyState
                title="まだ関連ナレッジがありません"
                description="MTGを記録して公開すると、この案件で得た知見がここに並びます。"
                action={
                  <ButtonLink
                    href={`/meetings/new?deal_id=${deal.id}`}
                    variant="primary"
                    size="sm"
                  >
                    MTGを記録
                  </ButtonLink>
                }
              />
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
