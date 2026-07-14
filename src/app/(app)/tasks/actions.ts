"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  TASK_PRIORITY,
  TASK_STATUS,
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("tasks").insert({
    title,
    status: status as TaskStatus,
    priority: priority as TaskPriority,
    due_date: str(formData.get("due_date")),
    company_id: str(formData.get("company_id")),
    note: str(formData.get("note")),
    assignee_id: user?.id ?? null,
  });

  if (error) {
    throw new Error(`登録に失敗しました: ${error.message}`);
  }

  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function toggleTaskDone(id: string, done: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: done ? "done" : "todo" })
    .eq("id", id);

  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }
  revalidatePath("/tasks");
}
