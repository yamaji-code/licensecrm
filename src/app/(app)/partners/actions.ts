"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  PARTNER_TYPE,
  REFERRAL_DIRECTION,
  type PartnerType,
  type ReferralDirection,
} from "@/lib/types";

function str(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

export async function createPartner(formData: FormData) {
  const name = str(formData.get("name"));
  if (!name) {
    throw new Error("パートナー名は必須です。");
  }

  const partnerType = String(formData.get("partner_type") ?? "company");
  if (!(partnerType in PARTNER_TYPE)) {
    throw new Error("種別の値が不正です。");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("partners").insert({
    name,
    name_kana: str(formData.get("name_kana")),
    partner_type: partnerType as PartnerType,
    contact_name: str(formData.get("contact_name")),
    email: str(formData.get("email")),
    phone: str(formData.get("phone")),
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
    throw new Error("パートナー名は必須です。");
  }

  const partnerType = String(formData.get("partner_type") ?? "company");
  if (!(partnerType in PARTNER_TYPE)) {
    throw new Error("種別の値が不正です。");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("partners")
    .update({
      name,
      name_kana: str(formData.get("name_kana")),
      partner_type: partnerType as PartnerType,
      contact_name: str(formData.get("contact_name")),
      email: str(formData.get("email")),
      phone: str(formData.get("phone")),
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
