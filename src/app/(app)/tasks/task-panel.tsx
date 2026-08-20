import Link from "next/link";
import { TASK_ASSIGNEE, TASK_PRIORITY, TASK_STATUS } from "@/lib/types";
import { Field, Input, Select, SubmitButton, Textarea } from "@/components/ui";
import { updateTask } from "./actions";
import { companyNameOf, type TaskWithCompany } from "./task-types";

/*
 * タスク名クリックで開く右側パネル。タイトル・担当者・期日・優先度・ステータス・メモを
 * まとめて編集できるようにする（一覧行のインライン編集はメモを持てないため、メモの
 * 確認・編集はここに集約する）。
 * 開閉はURLのクエリ（?task=id）で管理し、クライアント状態を持たない。
 */
export function TaskDetailPanel({
  task,
  closeHref,
}: {
  task: TaskWithCompany;
  closeHref: string;
}) {
  return (
    <>
      <Link
        href={closeHref}
        aria-label="パネルを閉じる"
        className="fixed inset-0 z-40 bg-ink/30"
        scroll={false}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-white shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <p className="min-w-0 truncate text-xs text-ink-faint">
            {companyNameOf(task) ?? "取引先未設定"}
          </p>
          <Link
            href={closeHref}
            aria-label="パネルを閉じる"
            scroll={false}
            className="-m-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg leading-none text-ink-soft hover:bg-surface hover:text-ink"
          >
            ×
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {task.deal_id && (
            <Link
              href={`/deals/${task.deal_id}`}
              className="mb-4 inline-block text-xs font-medium text-brand-700 hover:underline"
            >
              関連する案件を開く →
            </Link>
          )}

          <form action={updateTask} className="space-y-4">
            <input type="hidden" name="id" value={task.id} />
            <Field htmlFor={`panel-title-${task.id}`} label="タイトル" required>
              <Input
                id={`panel-title-${task.id}`}
                name="title"
                defaultValue={task.title}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field htmlFor={`panel-assignee-${task.id}`} label="担当者">
                <Select
                  id={`panel-assignee-${task.id}`}
                  name="assignee"
                  defaultValue={task.assignee ?? "ishida"}
                >
                  {Object.entries(TASK_ASSIGNEE).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field htmlFor={`panel-due-${task.id}`} label="期日">
                <Input
                  id={`panel-due-${task.id}`}
                  name="due_date"
                  type="date"
                  defaultValue={task.due_date ?? ""}
                />
              </Field>
              <Field htmlFor={`panel-priority-${task.id}`} label="優先度">
                <Select
                  id={`panel-priority-${task.id}`}
                  name="priority"
                  defaultValue={task.priority}
                >
                  {Object.entries(TASK_PRIORITY).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field htmlFor={`panel-status-${task.id}`} label="ステータス">
                <Select
                  id={`panel-status-${task.id}`}
                  name="status"
                  defaultValue={task.status}
                >
                  {Object.entries(TASK_STATUS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field htmlFor={`panel-note-${task.id}`} label="メモ">
              <Textarea
                id={`panel-note-${task.id}`}
                name="note"
                defaultValue={task.note ?? ""}
                rows={10}
                placeholder="メモ"
              />
            </Field>

            <SubmitButton pendingLabel="保存中…">保存</SubmitButton>
          </form>
        </div>
      </aside>
    </>
  );
}
