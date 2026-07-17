"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEAL_CHANNEL,
  DEAL_STAGE,
  DEAL_STAGE_ORDER,
  REFERRAL_CHANNELS,
  type DealChannel,
  type DealStage,
} from "@/lib/types";

function str(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

export async function createDeal(formData: FormData) {
  const title = str(formData.get("title"));
  if (!title) {
    throw new Error("案件名は必須です。");
  }

  const companyId = str(formData.get("company_id"));
  if (!companyId) {
    throw new Error("取引先は必須です。");
  }

  const channel = String(formData.get("channel") ?? "");
  if (!(channel in DEAL_CHANNEL)) {
    throw new Error("獲得チャネルの値が不正です。");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const partnerId = str(formData.get("partner_id"));

  // stage は DB デフォルトの 'list' で作成する。
  // stage_events への初回記録は deals の DB トリガーが行うため、ここでは書かない。
  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      company_id: companyId,
      title,
      channel: channel as DealChannel,
      partner_id: partnerId,
      note: str(formData.get("note")),
      owner_id: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`登録に失敗しました: ${error.message}`);
  }

  // 紹介系チャネルでパートナー指定がある場合は「紹介された」記録も残す
  if (REFERRAL_CHANNELS.includes(channel as DealChannel) && partnerId) {
    const { error: referralError } = await supabase.from("referrals").insert({
      partner_id: partnerId,
      direction: "received",
      deal_id: deal?.id ?? null,
      company_id: companyId,
    });
    if (referralError) {
      throw new Error(`紹介記録の登録に失敗しました: ${referralError.message}`);
    }
  }

  revalidatePath("/deals");
  redirect("/deals");
}

export async function updateDeal(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("案件IDが不正です。");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("deals")
    .update({ note: str(formData.get("note")) })
    .eq("id", id);

  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }

  revalidatePath(`/deals/${id}`);
  redirect(`/deals/${id}`);
}

// カンバンボードの「→ 次へ」用。タスクが全完了（未完了0件・かつ1件以上存在）
// している案件だけを、パイプライン順の次ステージへ進める。
// 条件はサーバー側で再検証する（クライアント改ざん・競合状態への防御）。
export async function advanceDealStage(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("案件IDが不正です。");
  }

  const supabase = await createClient();

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, stage")
    .eq("id", id)
    .single();
  if (dealError || !deal) {
    throw new Error("案件が見つかりませんでした。");
  }

  // パイプライン順で次ステージを求める。進行外（nurturing/lost）や末尾（live）は進めない。
  const currentIndex = DEAL_STAGE_ORDER.indexOf(deal.stage as DealStage);
  if (currentIndex < 0 || currentIndex >= DEAL_STAGE_ORDER.length - 1) {
    throw new Error("この案件は次のステージへ進められません。");
  }
  const nextStage = DEAL_STAGE_ORDER[currentIndex + 1];

  // タスク全完了の再検証: 紐づくタスクを取得し、1件以上あり未完了が0件であることを確認する。
  const { data: tasks, error: taskError } = await supabase
    .from("tasks")
    .select("status")
    .eq("deal_id", id);
  if (taskError) {
    throw new Error(`タスクの確認に失敗しました: ${taskError.message}`);
  }
  const total = tasks?.length ?? 0;
  const open = (tasks ?? []).filter((t) => t.status !== "done").length;
  if (total === 0 || open > 0) {
    throw new Error(
      "タスクが全て完了していないため、次のステージへ進められません。",
    );
  }

  // stage_events への記録は DB トリガー（log_stage_event）が自動で行う。
  const { error } = await supabase
    .from("deals")
    .update({ stage: nextStage })
    .eq("id", id);
  if (error) {
    throw new Error(`ステージ変更に失敗しました: ${error.message}`);
  }

  revalidatePath("/deals");
}

export async function changeDealStage(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("案件IDが不正です。");
  }

  const stage = String(formData.get("stage") ?? "");
  if (!(stage in DEAL_STAGE)) {
    throw new Error("ステージの値が不正です。");
  }

  const supabase = await createClient();
  // stage_events への記録は DB トリガー（log_stage_event）が自動で行う。
  // stage_events は RLS で直接 insert が禁止されているため、ここでは deals.stage の update のみ行う。
  const { error } = await supabase
    .from("deals")
    .update({ stage: stage as DealStage })
    .eq("id", id);

  if (error) {
    throw new Error(`ステージ変更に失敗しました: ${error.message}`);
  }

  revalidatePath(`/deals/${id}`);
  revalidatePath("/deals");
  redirect(`/deals/${id}`);
}
