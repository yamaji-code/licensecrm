"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { jstDateString } from "@/lib/date";
import {
  CLOSED_DEAL_STAGES,
  TASK_ASSIGNEE,
  TASK_PRIORITY,
  TASK_STATUS,
  type DealStage,
  type TaskAssignee,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";

function str(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

// ログインメールアドレスから担当者の初期値を推測する（山路さんなら yamaji、それ以外は ishida）。
// あくまで初期選択のヒントで、フォーム上でいつでも変更できる。
function assigneeFromEmail(email: string | null | undefined): TaskAssignee {
  const local = (email ?? "").trim().toLowerCase().split("@")[0] ?? "";
  return local.startsWith("yamaji") ? "yamaji" : "ishida";
}

export async function createTask(formData: FormData) {
  const title = str(formData.get("title"));
  if (!title) {
    throw new Error("タイトルは必須です。");
  }

  const status = String(formData.get("status") ?? "todo");
  const priority = String(formData.get("priority") ?? "medium");
  if (!(status in TASK_STATUS)) throw new Error("ステータスの値が不正です。");
  if (!(priority in TASK_PRIORITY)) throw new Error("優先度の値が不正です。");

  const dealId = str(formData.get("deal_id"));
  const dueDate = str(formData.get("due_date"));
  // 次アクション空白禁止ルール: 案件に紐づくタスクは期限必須（サーバー側で強制）
  if (dealId && !dueDate) {
    throw new Error("案件に紐づくタスクは期限の入力が必須です。");
  }

  const assigneeRaw = str(formData.get("assignee"));
  if (assigneeRaw && !(assigneeRaw in TASK_ASSIGNEE)) {
    throw new Error("担当者の値が不正です。");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("tasks").insert({
    title,
    status: status as TaskStatus,
    priority: priority as TaskPriority,
    due_date: dueDate,
    company_id: str(formData.get("company_id")),
    deal_id: dealId,
    note: str(formData.get("note")),
    assignee_id: user?.id ?? null,
    assignee: (assigneeRaw as TaskAssignee | null) ?? assigneeFromEmail(user?.email),
  });

  if (error) {
    throw new Error(`登録に失敗しました: ${error.message}`);
  }

  revalidatePath("/tasks");
  if (dealId) {
    revalidatePath(`/deals/${dealId}`);
    revalidatePath("/deals");
    redirect(`/deals/${dealId}`);
  }
  redirect("/tasks");
}

// next action の各項目をワンタッチで編集するためのインライン更新（タイトル・期限・優先度・ステータス・メモ）。
export async function updateTask(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("タスクIDが不正です。");
  }
  const title = str(formData.get("title"));
  if (!title) {
    throw new Error("タイトルは必須です。");
  }
  const dueDate = str(formData.get("due_date"));
  const note = str(formData.get("note"));
  const priority = String(formData.get("priority") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!(priority in TASK_PRIORITY)) throw new Error("優先度の値が不正です。");
  if (!(status in TASK_STATUS)) throw new Error("ステータスの値が不正です。");

  // assignee はこのフォームでは任意（案件詳細ページの編集フォームには項目が無いため）。
  // 送られてきた時だけ更新対象に含める。
  const hasAssignee = formData.has("assignee");
  const assigneeRaw = str(formData.get("assignee"));
  if (hasAssignee && assigneeRaw && !(assigneeRaw in TASK_ASSIGNEE)) {
    throw new Error("担当者の値が不正です。");
  }

  const supabase = await createClient();

  // 次アクション空白禁止ルール: 案件に紐づくタスクは期限必須（サーバー側で強制）
  const { data: existing } = await supabase
    .from("tasks")
    .select("deal_id")
    .eq("id", id)
    .maybeSingle();
  if (existing?.deal_id && !dueDate) {
    throw new Error("案件に紐づくタスクは期限の入力が必須です。");
  }

  const { data: updated, error } = await supabase
    .from("tasks")
    .update({
      title,
      due_date: dueDate,
      note,
      priority: priority as TaskPriority,
      status: status as TaskStatus,
      ...(hasAssignee ? { assignee: assigneeRaw as TaskAssignee | null } : {}),
    })
    .eq("id", id)
    .select("deal_id")
    .single();

  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }

  revalidatePath("/tasks");
  const dealId = updated?.deal_id ?? null;
  if (dealId) {
    revalidatePath(`/deals/${dealId}`);
    revalidatePath("/deals");
  }
}

// next action のワンタッチ追記用。案件詳細ページ／タスク一覧のどちらからも、
// タイトルだけで即追加できるようにする（deal_id は任意。指定時のみ案件側も再検証する）。
// 期限は次アクション空白禁止ルールを満たすため自動で+7日を設定する。
export async function quickAddNextAction(formData: FormData) {
  const title = str(formData.get("title"));
  if (!title) {
    return;
  }
  const dealId = str(formData.get("deal_id"));

  const priority = String(formData.get("priority") ?? "medium");
  const status = String(formData.get("status") ?? "todo");
  if (!(priority in TASK_PRIORITY)) throw new Error("優先度の値が不正です。");
  if (!(status in TASK_STATUS)) throw new Error("ステータスの値が不正です。");

  const dueDate = str(formData.get("due_date")) ?? jstDateString(7);
  // 次アクション空白禁止ルール: 案件に紐づくタスクは期限必須
  if (dealId && !dueDate) {
    throw new Error("案件に紐づくタスクは期限の入力が必須です。");
  }

  const assigneeRaw = str(formData.get("assignee"));
  if (assigneeRaw && !(assigneeRaw in TASK_ASSIGNEE)) {
    throw new Error("担当者の値が不正です。");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("tasks").insert({
    title,
    status: status as TaskStatus,
    priority: priority as TaskPriority,
    due_date: dueDate,
    note: str(formData.get("note")),
    deal_id: dealId,
    assignee_id: user?.id ?? null,
    assignee: (assigneeRaw as TaskAssignee | null) ?? assigneeFromEmail(user?.email),
  });

  if (error) {
    throw new Error(`追加に失敗しました: ${error.message}`);
  }

  revalidatePath("/tasks");
  if (!dealId) {
    return;
  }

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
}

export async function toggleTaskDone(id: string, done: boolean) {
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("tasks")
    .update({ status: done ? "done" : "todo" })
    .eq("id", id)
    .select("deal_id")
    .single();

  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }
  revalidatePath("/tasks");

  const dealId = updated?.deal_id ?? null;
  if (!done || !dealId) {
    return;
  }

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");

  // 次アクション空白禁止ルール: 対象dealがアクティブ（SV案内可能/時期見送り/失注ではない）かつ
  // 他に未完了タスクが無ければ、次のタスク登録画面へ誘導する。
  const { data: deal } = await supabase
    .from("deals")
    .select("stage")
    .eq("id", dealId)
    .maybeSingle();

  const stage = deal?.stage as DealStage | undefined;
  if (!stage || CLOSED_DEAL_STAGES.includes(stage)) {
    return;
  }

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("deal_id", dealId)
    .neq("status", "done");

  if ((count ?? 0) === 0) {
    redirect(`/tasks/new?deal_id=${dealId}&next=1`);
  }
}

function revalidateTaskViews(dealId: string | null) {
  revalidatePath("/tasks");
  if (dealId) {
    revalidatePath(`/deals/${dealId}`);
    revalidatePath("/deals");
  }
}

// 一覧の行内で直接変更するための単項目更新。タイトル等は不要なので updateTask とは分けている。
export async function updateTaskAssignee(id: string, assignee: string) {
  if (assignee !== "" && !(assignee in TASK_ASSIGNEE)) {
    throw new Error("担当者の値が不正です。");
  }
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("tasks")
    .update({ assignee: assignee === "" ? null : (assignee as TaskAssignee) })
    .eq("id", id)
    .select("deal_id")
    .single();
  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }
  revalidateTaskViews(updated?.deal_id ?? null);
}

export async function updateTaskPriority(id: string, priority: string) {
  if (!(priority in TASK_PRIORITY)) {
    throw new Error("優先度の値が不正です。");
  }
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("tasks")
    .update({ priority: priority as TaskPriority })
    .eq("id", id)
    .select("deal_id")
    .single();
  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }
  revalidateTaskViews(updated?.deal_id ?? null);
}

// ステータスを「完了」にする変更は、次アクション誘導を含む toggleTaskDone に委ねる。
export async function updateTaskStatus(id: string, status: string) {
  if (!(status in TASK_STATUS)) {
    throw new Error("ステータスの値が不正です。");
  }
  if (status === "done") {
    await toggleTaskDone(id, true);
    return;
  }
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("tasks")
    .update({ status: status as TaskStatus })
    .eq("id", id)
    .select("deal_id")
    .single();
  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }
  revalidateTaskViews(updated?.deal_id ?? null);
}

export async function updateTaskDueDate(id: string, dueDate: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("tasks")
    .select("deal_id")
    .eq("id", id)
    .maybeSingle();
  // 次アクション空白禁止ルール: 案件に紐づくタスクは期限必須（サーバー側で強制）
  if (existing?.deal_id && !dueDate) {
    throw new Error("案件に紐づくタスクは期限の入力が必須です。");
  }
  const { data: updated, error } = await supabase
    .from("tasks")
    .update({ due_date: dueDate === "" ? null : dueDate })
    .eq("id", id)
    .select("deal_id")
    .single();
  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }
  revalidateTaskViews(updated?.deal_id ?? null);
}
