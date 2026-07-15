"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEAL_CHANNEL,
  DEAL_STAGE,
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
