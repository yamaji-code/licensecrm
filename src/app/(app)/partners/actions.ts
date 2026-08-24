"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  PARTNER_RANK,
  PARTNER_STAGE,
  REFERRAL_DIRECTION,
  type PartnerRank,
  type PartnerStage,
  type ReferralDirection,
} from "@/lib/types";

function str(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

export async function createPartner(formData: FormData) {
  const name = str(formData.get("name"));
  if (!name) {
    throw new Error("名前は必須です。");
  }

  const rank = str(formData.get("rank"));
  if (rank && !(rank in PARTNER_RANK)) {
    throw new Error("ランクの値が不正です。");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("partners").insert({
    name,
    company_name: str(formData.get("company_name")),
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
    referred_by: str(formData.get("referred_by")),
    specialty: str(formData.get("specialty")),
    rank: rank as PartnerRank | null,
    referral_fee: str(formData.get("referral_fee")),
    note: str(formData.get("note")),
    owner_id: user?.id ?? null,
  });

  if (error) {
    throw new Error(`登録に失敗しました: ${error.message}`);
  }

  revalidatePath("/partners");
  redirect("/partners");
}

export async function updatePartner(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("パートナーIDが不正です。");
  }

  const name = str(formData.get("name"));
  if (!name) {
    throw new Error("名前は必須です。");
  }

  const rank = str(formData.get("rank"));
  if (rank && !(rank in PARTNER_RANK)) {
    throw new Error("ランクの値が不正です。");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("partners")
    .update({
      name,
      company_name: str(formData.get("company_name")),
      phone: str(formData.get("phone")),
      email: str(formData.get("email")),
      referred_by: str(formData.get("referred_by")),
      specialty: str(formData.get("specialty")),
      rank: rank as PartnerRank | null,
      referral_fee: str(formData.get("referral_fee")),
      note: str(formData.get("note")),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }

  revalidatePath(`/partners/${id}`);
  revalidatePath("/partners");
  redirect(`/partners/${id}`);
}

// ステータス（看板の列に相当）だけを変更する軽量な更新。基本情報フォームとは別に、
// 一覧や詳細ページから素早く切り替えられるようにする。
export async function updatePartnerStage(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("パートナーIDが不正です。");
  }
  const stage = String(formData.get("stage") ?? "");
  if (!(stage in PARTNER_STAGE)) {
    throw new Error("ステータスの値が不正です。");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("partners")
    .update({ stage: stage as PartnerStage })
    .eq("id", id);

  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }

  revalidatePath(`/partners/${id}`);
  revalidatePath("/partners");
}

export async function createReferral(formData: FormData) {
  const partnerId = str(formData.get("partner_id"));
  if (!partnerId) {
    throw new Error("パートナーIDが不正です。");
  }

  const direction = String(formData.get("direction") ?? "");
  if (!(direction in REFERRAL_DIRECTION)) {
    throw new Error("方向の値が不正です。");
  }

  const supabase = await createClient();

  // occurred_on は DB 側が not null + default current_date のため、
  // 未入力なら key ごと省略して DB デフォルトに任せる（null を明示送信すると制約違反になる）。
  const insertData: {
    partner_id: string;
    direction: ReferralDirection;
    deal_id: string | null;
    company_id: string | null;
    note: string | null;
    occurred_on?: string;
  } = {
    partner_id: partnerId,
    direction: direction as ReferralDirection,
    deal_id: str(formData.get("deal_id")),
    company_id: str(formData.get("company_id")),
    note: str(formData.get("note")),
  };

  const occurredOn = str(formData.get("occurred_on"));
  if (occurredOn) {
    insertData.occurred_on = occurredOn;
  }

  const { error } = await supabase.from("referrals").insert(insertData);

  if (error) {
    throw new Error(`紹介記録の登録に失敗しました: ${error.message}`);
  }

  revalidatePath(`/partners/${partnerId}`);
  redirect(`/partners/${partnerId}`);
}
