"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SCENE_TAG, type SceneTag } from "@/lib/types";

function str(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

// 困りごとを（MTGを介さず）直接キューへ登録する
export async function createKnowledgeCard(formData: FormData) {
  const problem = str(formData.get("problem"));
  if (!problem) {
    throw new Error("困りごとの内容は必須です。");
  }

  const sceneTag = String(formData.get("scene_tag") ?? "");
  if (!(sceneTag in SCENE_TAG)) {
    throw new Error("場面タグの値が不正です。");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("knowledge_cards").insert({
    scene_tag: sceneTag as SceneTag,
    problem,
    status: "open",
    deal_id: str(formData.get("deal_id")),
    company_id: str(formData.get("company_id")),
    requested_by: user?.id ?? null,
  });

  if (error) {
    throw new Error(`登録に失敗しました: ${error.message}`);
  }

  revalidatePath("/knowledge");
  redirect("/knowledge?tab=queue");
}

// open → review_requested（山路に確認を依頼する）
export async function requestReview(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("ナレッジカードIDが不正です。");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("knowledge_cards")
    .update({ status: "review_requested", requested_by: user?.id ?? null })
    .eq("id", id);

  if (error) {
    throw new Error(`確認依頼に失敗しました: ${error.message}`);
  }

  revalidatePath("/knowledge");
  redirect("/knowledge?tab=queue");
}

// review_requested → answered（回答内容を記録する）
export async function answerCard(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("ナレッジカードIDが不正です。");
  }

  const solution = str(formData.get("solution"));
  if (!solution) {
    throw new Error("回答内容は必須です。");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("knowledge_cards")
    .update({ status: "answered", solution, answered_by: user?.id ?? null })
    .eq("id", id);

  if (error) {
    throw new Error(`回答の登録に失敗しました: ${error.message}`);
  }

  revalidatePath("/knowledge");
  redirect("/knowledge?tab=queue");
}

// answered → published（ナレッジとして公開する）
export async function publishCard(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("ナレッジカードIDが不正です。");
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("knowledge_cards")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id)
    .select("deal_id")
    .single();

  if (error) {
    throw new Error(`公開に失敗しました: ${error.message}`);
  }

  revalidatePath("/knowledge");
  // 公開すると /deals/[id] の「関連ナレッジ」表示に反映されるため、対象案件があれば再検証する
  if (updated?.deal_id) {
    revalidatePath(`/deals/${updated.deal_id}`);
  }
  redirect("/knowledge?tab=published");
}
