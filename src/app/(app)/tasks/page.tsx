import Link from "next/link";
import {
  TASK_PRIORITY_DOT,
  TASK_PRIORITY_STYLE,
  TASK_STATUS_STYLE,
} from "@/components/badges";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  addMonths,
  jstDateString,
  monthGridDates,
  startOfMonth,
  weekDates,
} from "@/lib/date";
import {
  compareTaskPriorityThenDueDate,
  TASK_PRIORITY,
  TASK_STATUS,
  type Task,
} from "@/lib/types";
import {
  ButtonLink,
  Card,
  CardBody,
  EmptyState,
  Input,
  LoadErrorBanner,
  PageHeader,
  PageShell,
  Segmented,
  Select,
  SubmitButton,
  TBody,
  TD,
  Textarea,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";
import { quickAddNextAction, toggleTaskDone, updateTask } from "./actions";
import { TaskModalTrigger } from "./task-modal";

// タスクは company_id を直接持たないことが多い（案件のnext actionはdeal_idだけで
// 作られるため）。表示する取引先名は、直接の company_id が無ければ紐づく案件の
// 取引先で補う。
type TaskWithCompany = Task & {
  companies: { name: string } | null;
  deals: { companies: { name: string } | null } | null;
};

function companyNameOf(task: TaskWithCompany): string | null {
  return task.companies?.name ?? task.deals?.companies?.name ?? null;
}

type TaskRange = "list" | "day" | "week" | "month";

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

function formatJaDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日(${WEEKDAY_JA[d.getUTCDay()]})`;
}

function formatJaShort(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEKDAY_JA[d.getUTCDay()]})`;
}

/**
 * 完了トグル。押すと状態が反転するので aria-pressed で「今どちらか」を伝える
 * （aria-label だけだと読み上げで現在の状態が分からない）。
 * 丸印そのものは小さいが、押せる範囲は 40px を確保する。
 */
function DoneToggle({
  task,
  action,
}: {
  task: TaskWithCompany;
  action: (formData: FormData) => Promise<void>;
}) {
  const done = task.status === "done";
  return (
    <form action={action}>
      <input type="hidden" name="id" value={task.id} />
      <input type="hidden" name="done" value={done ? "false" : "true"} />
      <button
        type="submit"
        aria-label={done ? "未完了に戻す" : "完了にする"}
        aria-pressed={done}
        className="-m-2 flex h-10 w-10 items-center justify-center rounded-full"
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
            done
              ? "border-ok bg-ok text-white"
              : "border-line text-transparent hover:border-brand-500"
          }`}
        >
          ✓
        </span>
      </button>
    </form>
  );
}

function PriorityLabel({ task }: { task: TaskWithCompany }) {
  return (
    <span className={`text-xs font-medium ${TASK_PRIORITY_STYLE[task.priority]}`}>
      {TASK_PRIORITY[task.priority]}
    </span>
  );
}

function StatusBadge({ task }: { task: TaskWithCompany }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
        TASK_STATUS_STYLE[task.status]
      }`}
    >
      {TASK_STATUS[task.status]}
    </span>
  );
}

// タイトル・優先度・ステータス・期限・メモ。インライン編集フォームとモーダル詳細で共用する。
function TaskFields({ task }: { task: TaskWithCompany }) {
  return (
    <>
      <Input name="title" defaultValue={task.title} required />
      <div className="flex flex-wrap items-center gap-2">
        <Select name="priority" defaultValue={task.priority} className="w-24">
          {Object.entries(TASK_PRIORITY).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={task.status} className="w-28">
          {Object.entries(TASK_STATUS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          name="due_date"
          type="date"
          defaultValue={task.due_date ?? ""}
          className="w-40"
        />
      </div>
      <Textarea
        name="note"
        defaultValue={task.note ?? ""}
        placeholder="メモ"
        rows={3}
      />
    </>
  );
}

// ワンタッチ編集: クリックでタイトルが編集可能になる（案件詳細ページと同じ挙動）
function TaskTitle({ task }: { task: TaskWithCompany }) {
  return (
    <>
      <details>
        <summary
          className={`cursor-pointer list-none marker:hidden hover:text-brand-700 hover:underline ${
            task.status === "done"
              ? "font-medium text-ink-faint line-through"
              : "font-medium text-ink"
          }`}
        >
          {task.title}
        </summary>
        <form action={updateTask} className="mt-2 space-y-2">
          <input type="hidden" name="id" value={task.id} />
          <TaskFields task={task} />
          <SubmitButton size="sm" pendingLabel="保存中…">
            保存
          </SubmitButton>
        </form>
      </details>
      {companyNameOf(task) && (
        <p className="text-xs text-ink-faint">{companyNameOf(task)}</p>
      )}
    </>
  );
}

// タスクの全項目（メモ含む）をポップアップで確認・編集する。
// カレンダー表示は行/セルが狭く、タイトルが省略されがちなので、詳細はモーダルにまとめて見せる。
function TaskDetail({
  task,
  action,
}: {
  task: TaskWithCompany;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-ink-faint">
          {companyNameOf(task) ?? "取引先未設定"}
        </p>
        <DoneToggle task={task} action={action} />
      </div>
      <form action={updateTask} className="space-y-3">
        <input type="hidden" name="id" value={task.id} />
        <TaskFields task={task} />
        <SubmitButton pendingLabel="保存中…">保存</SubmitButton>
      </form>
    </div>
  );
}

// カレンダー表示（日/週/月）のセル内に置く、1件ぶんの小さな行。
// 案件に紐づくタスクはタップで案件ページへ（カレンダーからそのまま案件の全体像を見に行きたいため）、
// 紐づかないタスクはタップでモーダル編集にする。
function TaskChip({
  task,
  action,
}: {
  task: TaskWithCompany;
  action: (formData: FormData) => Promise<void>;
}) {
  const done = task.status === "done";
  const companyName = companyNameOf(task);
  const titleClassName = `block w-full truncate text-left text-[10px] leading-tight hover:text-brand-700 hover:underline ${
    done ? "text-ink-faint line-through" : "text-ink"
  }`;
  return (
    <li className="flex items-center gap-1 rounded-md border border-line bg-white px-1 py-0.5">
      <DoneToggle task={task} action={action} />
      <div className="min-w-0 flex-1">
        {task.deal_id ? (
          <Link href={`/deals/${task.deal_id}`} className={titleClassName}>
            {task.title}
          </Link>
        ) : (
          <TaskModalTrigger
            trigger={task.title}
            triggerClassName={titleClassName}
          >
            <TaskDetail task={task} action={action} />
          </TaskModalTrigger>
        )}
        {companyName && (
          <p className="truncate text-[8px] leading-tight text-ink-faint">
            {companyName}
          </p>
        )}
      </div>
      <span
        className={`shrink-0 text-[9px] font-medium ${TASK_PRIORITY_STYLE[task.priority]}`}
      >
        {TASK_PRIORITY[task.priority]}
      </span>
    </li>
  );
}

// 期限切れ（未完了かつ期限が今日より前）は赤で緊急感を出す
function DueDate({ task }: { task: TaskWithCompany }) {
  if (!task.due_date) {
    return <span className="text-ink-faint">期限なし</span>;
  }
  const overdue = task.status !== "done" && task.due_date < jstDateString();
  if (!overdue) {
    return <span>{task.due_date}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-medium text-danger">{task.due_date}</span>
      <span className="rounded-full border border-danger/25 bg-danger-bg px-1.5 py-0.5 text-[10px] font-medium text-danger">
        期限切れ
      </span>
    </span>
  );
}

// 広い画面は表、狭い画面はカードに落とすタスク一覧（リスト表示・日表示で共用）
function TaskTable({
  tasks,
  markDone,
}: {
  tasks: TaskWithCompany[];
  markDone: (formData: FormData) => Promise<void>;
}) {
  return (
    <>
      <Card className="hidden sm:block">
        <Table caption="タスクの一覧">
          <THead>
            <TR className="hover:bg-transparent">
              <TH className="w-12">
                <span className="sr-only">完了</span>
              </TH>
              <TH>タスク</TH>
              <TH>優先度</TH>
              <TH>ステータス</TH>
              <TH>期限</TH>
            </TR>
          </THead>
          <TBody>
            {tasks.map((t) => (
              <TR key={t.id}>
                <TD className="align-middle">
                  <DoneToggle task={t} action={markDone} />
                </TD>
                <TD>
                  <TaskTitle task={t} />
                </TD>
                <TD>
                  <PriorityLabel task={t} />
                </TD>
                <TD>
                  <StatusBadge task={t} />
                </TD>
                <TD className="whitespace-nowrap text-xs text-ink-soft">
                  <DueDate task={t} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <ul className="space-y-2 sm:hidden">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="flex items-start gap-4 rounded-card border border-line bg-white px-4 py-3 shadow-card"
          >
            <div className="pt-0.5">
              <DoneToggle task={t} action={markDone} />
            </div>
            <div className="min-w-0 flex-1">
              <TaskTitle task={t} />
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge task={t} />
                <PriorityLabel task={t} />
                <span className="text-xs text-ink-soft">
                  <DueDate task={t} />
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string | string[];
    range?: string | string[];
    date?: string | string[];
  }>;
}) {
  const { view, range: rangeParam, date: dateParam } = await searchParams;
  const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  const showDone = first(view) === "done";
  const rangeRaw = first(rangeParam);
  const range: TaskRange =
    rangeRaw === "day" || rangeRaw === "week" || rangeRaw === "month"
      ? rangeRaw
      : "list";
  const anchorDate = first(dateParam) || jstDateString();

  const supabase = await createClient();

  // カレンダー表示（日/週/月）: 表示期間内の未完了タスク＋期限なしの未完了タスクを取得する。
  // 完了済みはスケジュールの対象外なのでカレンダーには出さない（リスト表示側で確認する）。
  let calendarDays: string[] = [];
  const tasksByDate = new Map<string, TaskWithCompany[]>();
  let noDueTasks: TaskWithCompany[] = [];
  let calendarError: string | null = null;

  // リスト表示: 従来どおり完了/未完了をまとめて1つの並びで扱う。
  let tasks: TaskWithCompany[] = [];
  let listError: string | null = null;
  let doneCount = 0;

  if (range === "list") {
    const [{ data, error }, { count }] = await Promise.all([
      showDone
        ? supabase
            .from("tasks")
            .select("*, companies ( name ), deals ( companies ( name ) )")
            .eq("status", "done")
            .order("updated_at", { ascending: false })
        : supabase
            .from("tasks")
            .select("*, companies ( name ), deals ( companies ( name ) )")
            .neq("status", "done"),
      // 開いている一覧側にだけ出す「完了済み」リンクの件数
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "done"),
    ]);
    listError = error?.message ?? null;
    doneCount = count ?? 0;
    // 優先度が高い順→期日が古い順（完了済み一覧は完了順のためここでは並べ替えない）
    tasks = showDone
      ? ((data ?? []) as TaskWithCompany[])
      : ((data ?? []) as TaskWithCompany[]).toSorted(
          compareTaskPriorityThenDueDate,
        );
  } else {
    calendarDays =
      range === "day"
        ? [anchorDate]
        : range === "week"
          ? weekDates(anchorDate)
          : monthGridDates(anchorDate);
    const rangeStart = calendarDays[0];
    const rangeEnd = calendarDays[calendarDays.length - 1];

    const [{ data: rangeData, error }, { data: noDueData }] =
      await Promise.all([
        supabase
          .from("tasks")
          .select("*, companies ( name ), deals ( companies ( name ) )")
          .neq("status", "done")
          .gte("due_date", rangeStart)
          .lte("due_date", rangeEnd),
        supabase
          .from("tasks")
          .select("*, companies ( name ), deals ( companies ( name ) )")
          .neq("status", "done")
          .is("due_date", null),
      ]);
    calendarError = error?.message ?? null;

    for (const t of (rangeData ?? []) as TaskWithCompany[]) {
      if (!t.due_date) continue;
      const list = tasksByDate.get(t.due_date) ?? [];
      list.push(t);
      tasksByDate.set(t.due_date, list);
    }
    for (const list of tasksByDate.values()) {
      list.sort(compareTaskPriorityThenDueDate);
    }
    noDueTasks = ((noDueData ?? []) as TaskWithCompany[]).toSorted(
      compareTaskPriorityThenDueDate,
    );
  }

  const visibleCount =
    range === "list"
      ? tasks.length
      : [...tasksByDate.values()].reduce((n, l) => n + l.length, 0) +
        noDueTasks.length;

  async function markDone(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const done = formData.get("done") === "true";
    await toggleTaskDone(id, done);
  }

  // 表示期間の前後移動・見出し
  let prevHref = "";
  let nextHref = "";
  let todayHref = "";
  let rangeLabel = "";
  if (range === "day") {
    prevHref = `/tasks?range=day&date=${addDays(anchorDate, -1)}`;
    nextHref = `/tasks?range=day&date=${addDays(anchorDate, 1)}`;
    todayHref = `/tasks?range=day&date=${jstDateString()}`;
    rangeLabel = formatJaDate(anchorDate);
  } else if (range === "week") {
    const days = weekDates(anchorDate);
    prevHref = `/tasks?range=week&date=${addDays(days[0], -7)}`;
    nextHref = `/tasks?range=week&date=${addDays(days[0], 7)}`;
    todayHref = `/tasks?range=week&date=${jstDateString()}`;
    rangeLabel = `${formatJaShort(days[0])} 〜 ${formatJaShort(days[6])}`;
  } else if (range === "month") {
    const monthStart = startOfMonth(anchorDate);
    prevHref = `/tasks?range=month&date=${addMonths(monthStart, -1)}`;
    nextHref = `/tasks?range=month&date=${addMonths(monthStart, 1)}`;
    todayHref = `/tasks?range=month&date=${jstDateString()}`;
    rangeLabel = `${monthStart.slice(0, 4)}年${Number(monthStart.slice(5, 7))}月`;
  }

  const today = jstDateString();

  return (
    <PageShell>
      <PageHeader
        title={showDone ? "完了したタスク" : "タスク"}
        meta={`${visibleCount} 件`}
        actions={
          <>
            <Segmented
              label="表示形式"
              active={range}
              options={[
                { value: "list", label: "リスト", href: "/tasks" },
                {
                  value: "day",
                  label: "日",
                  href: `/tasks?range=day&date=${anchorDate}`,
                },
                {
                  value: "week",
                  label: "週",
                  href: `/tasks?range=week&date=${anchorDate}`,
                },
                {
                  value: "month",
                  label: "月",
                  href: `/tasks?range=month&date=${anchorDate}`,
                },
              ]}
            />
            {range === "list" &&
              (showDone ? (
                <ButtonLink href="/tasks" variant="secondary">
                  ← 未完了に戻る
                </ButtonLink>
              ) : (
                <ButtonLink href="/tasks?view=done" variant="secondary">
                  完了済み（{doneCount}件）
                </ButtonLink>
              ))}
            <ButtonLink href="/tasks/new" variant="primary">
              新規登録
            </ButtonLink>
          </>
        }
      />

      {range !== "list" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <ButtonLink href={prevHref} variant="secondary" size="sm">
              ← 前
            </ButtonLink>
            <ButtonLink href={todayHref} variant="secondary" size="sm">
              今日
            </ButtonLink>
            <ButtonLink href={nextHref} variant="secondary" size="sm">
              次 →
            </ButtonLink>
          </div>
          <p className="text-sm font-medium text-ink">{rangeLabel}</p>
        </div>
      )}

      {/* ワンタッチ追記。案件に紐づけたい場合や詳細な設定は「新規登録」から */}
      {!showDone && (
        <div className="mb-4">
          <Card>
            <CardBody>
              <form action={quickAddNextAction} className="space-y-2">
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
                  <Select name="priority" defaultValue="medium" className="w-24">
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
                  <Input name="due_date" type="date" className="w-40" />
                </div>
                <Textarea name="note" placeholder="メモ" rows={2} />
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {(listError || calendarError) && (
        <div className="mb-4">
          <LoadErrorBanner message={(listError ?? calendarError) as string} />
        </div>
      )}

      {range === "list" &&
        (tasks.length === 0 ? (
          <Card>
            <EmptyState
              title={
                showDone ? "まだ完了したタスクがありません" : "まだタスクがありません"
              }
              description={
                showDone
                  ? "タスクを完了にすると、ここに並びます。"
                  : "次にやることを登録すると、期限・優先度つきで抜け漏れを追えるようになります。"
              }
              action={
                showDone ? undefined : (
                  <ButtonLink href="/tasks/new" variant="primary" size="sm">
                    最初のタスクを登録
                  </ButtonLink>
                )
              }
            />
          </Card>
        ) : (
          <TaskTable tasks={tasks} markDone={markDone} />
        ))}

      {range === "day" && (
        <>
          {noDueTasks.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 text-xs font-medium text-ink-soft">
                期限なし
              </p>
              <TaskTable tasks={noDueTasks} markDone={markDone} />
            </div>
          )}
          {(tasksByDate.get(anchorDate) ?? []).length === 0 ? (
            <Card>
              <EmptyState
                title="この日のタスクはありません"
                description="ワンタッチ追記や新規登録から追加できます。"
              />
            </Card>
          ) : (
            <TaskTable
              tasks={tasksByDate.get(anchorDate) ?? []}
              markDone={markDone}
            />
          )}
        </>
      )}

      {range === "week" && (
        <>
          {noDueTasks.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 text-xs font-medium text-ink-soft">
                期限なし
              </p>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {noDueTasks.map((t) => (
                  <TaskChip key={t.id} task={t} action={markDone} />
                ))}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
            {calendarDays.map((d) => {
              const dayTasks = tasksByDate.get(d) ?? [];
              return (
                <div key={d} className="min-w-0">
                  <p
                    className={`mb-1.5 text-xs font-medium ${
                      d === today ? "text-brand-700" : "text-ink-soft"
                    }`}
                  >
                    {formatJaShort(d)}
                  </p>
                  {dayTasks.length === 0 ? (
                    <p className="text-xs text-ink-faint">—</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {dayTasks.map((t) => (
                        <TaskChip key={t.id} task={t} action={markDone} />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {range === "month" && (
        <>
          {noDueTasks.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 text-xs font-medium text-ink-soft">
                期限なし
              </p>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {noDueTasks.map((t) => (
                  <TaskChip key={t.id} task={t} action={markDone} />
                ))}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((d) => {
              const dayTasks = tasksByDate.get(d) ?? [];
              const inMonth = d.slice(0, 7) === anchorDate.slice(0, 7);
              return (
                <div
                  key={d}
                  className={`flex min-h-28 flex-col rounded-md border p-1 sm:p-1.5 ${
                    d === today
                      ? "border-brand-300 bg-brand-50"
                      : "border-line"
                  } ${inMonth ? "bg-white" : "bg-surface"}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <Link
                      href={`/tasks?range=day&date=${d}`}
                      className={`text-xs font-medium hover:text-brand-700 hover:underline ${
                        inMonth ? "text-ink" : "text-ink-faint"
                      }`}
                    >
                      {Number(d.slice(8, 10))}
                    </Link>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] text-ink-faint">
                        {dayTasks.length}件
                      </span>
                    )}
                  </div>
                  {/* 「+N件」で隠さず、セル内スクロールで全件見られるようにする。
                      案件に紐づくタスクは案件ページへ、紐づかないタスクはモーダル編集へ */}
                  <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto">
                    {dayTasks.map((t) => {
                      const dot = (
                        <span
                          aria-hidden="true"
                          className={`h-1 w-1 shrink-0 rounded-full ${TASK_PRIORITY_DOT[t.priority]}`}
                        />
                      );
                      const rowClassName = `flex w-full items-center gap-1 text-left text-[9px] leading-tight hover:underline ${TASK_PRIORITY_STYLE[t.priority]}`;
                      return (
                        <li key={t.id}>
                          {t.deal_id ? (
                            <Link href={`/deals/${t.deal_id}`} className={rowClassName}>
                              {dot}
                              <span className="truncate">{t.title}</span>
                            </Link>
                          ) : (
                            <TaskModalTrigger
                              trigger={
                                <span className="flex items-center gap-1">
                                  {dot}
                                  <span className="truncate">{t.title}</span>
                                </span>
                              }
                              triggerClassName={rowClassName}
                            >
                              <TaskDetail task={t} action={markDone} />
                            </TaskModalTrigger>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
    </PageShell>
  );
}
