"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEAL_CHANNEL,
  REFERRAL_CHANNELS,
  type DealChannel,
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
