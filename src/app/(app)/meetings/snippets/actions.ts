"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function str(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

export async function createSnippet(formData: FormData) {
  const title = str(formData.get("title"));
  const body = str(formData.get("body"));
  if (!title || !body) {
    throw new Error("タイトルと本文は必須です。");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("meeting_snippets").insert({
    title,
    body,
    created_by: user?.id ?? null,
  });

  if (error) {
    throw new Error(`登録に失敗しました: ${error.message}`);
  }

  revalidatePath("/meetings/snippets");
}

export async function deleteSnippet(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("スニペットIDが指定されていません。");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("meeting_snippets").delete().eq("id", id);

  if (error) {
    throw new Error(`削除に失敗しました: ${error.message}`);
  }

  revalidatePath("/meetings/snippets");
}
