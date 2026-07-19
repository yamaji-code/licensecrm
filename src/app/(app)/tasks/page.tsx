import { TASK_PRIORITY_STYLE, TASK_STATUS_STYLE } from "@/components/badges";
import { createClient } from "@/lib/supabase/server";
import { TASK_PRIORITY, TASK_STATUS, type Task } from "@/lib/types";
import {
  ButtonLink,
  Card,
  EmptyState,
  LoadErrorBanner,
  PageHeader,
  PageShell,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";
import { toggleTaskDone } from "./actions";

type TaskWithCompany = Task & { companies: { name: string } | null };

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

function TaskTitle({ task }: { task: TaskWithCompany }) {
  return (
    <>
      <p
        className={`font-medium ${
          task.status === "done" ? "text-ink-faint line-through" : "text-ink"
        }`}
      >
        {task.title}
      </p>
      {task.companies?.name && (
        <p className="text-xs text-ink-faint">{task.companies.name}</p>
      )}
    </>
  );
}

export default async function TasksPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, companies ( name )")
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false });

  const tasks = (data ?? []) as TaskWithCompany[];

  async function markDone(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const done = formData.get("done") === "true";
    await toggleTaskDone(id, done);
  }

  return (
    <PageShell>
      <PageHeader
        title="タスク"
        meta={`${tasks.length} 件`}
        actions={
          <ButtonLink href="/tasks/new" variant="primary">
            新規登録
          </ButtonLink>
        }
      />

      {error && (
        <div className="mb-4">
          <LoadErrorBanner message={error.message} />
        </div>
      )}

      {tasks.length === 0 ? (
        <Card>
          <EmptyState
            title="まだタスクがありません"
            description="次にやることを登録すると、期限・優先度つきで抜け漏れを追えるようになります。"
            action={
              <ButtonLink href="/tasks/new" variant="primary" size="sm">
                最初のタスクを登録
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <>
          {/* 広い画面は表。狭い画面は列が潰れて読めなくなるためカードに落とす */}
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
                      {t.due_date ?? "期限なし"}
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
                      {t.due_date ?? "期限なし"}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageShell>
  );
}
