"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CLOSED_DEAL_STAGES,
  TASK_PRIORITY,
  TASK_STATUS,
  type DealStage,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";

function str(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
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
