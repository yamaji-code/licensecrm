"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  COMPANY_STATUS,
  CONTACT_DECISION_ROLE,
  CONTACT_LEAD_TIME,
  TIER,
  type CompanyStatus,
  type ContactDecisionRole,
  type ContactLeadTime,
  type Tier,
} from "@/lib/types";

function str(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

export async function createCompany(formData: FormData) {
  const name = str(formData.get("name"));
  if (!name) {
    throw new Error("会社名は必須です。");
  }

  const status = String(formData.get("status") ?? "prospect");
  if (!(status in COMPANY_STATUS)) {
    throw new Error("ステータスの値が不正です。");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tierValue = String(formData.get("tier") ?? "");

  const { error } = await supabase.from("companies").insert({
    name,
    name_kana: str(formData.get("name_kana")),
    status: status as CompanyStatus,
    tier: tierValue in TIER ? (tierValue as Tier) : null,
    target_brand: str(formData.get("target_brand")),
    lead_source: str(formData.get("lead_source")),
    parent_company: str(formData.get("parent_company")),
    industry: str(formData.get("industry")),
    phone: str(formData.get("phone")),
    website: str(formData.get("website")),
    address: str(formData.get("address")),
    note: str(formData.get("note")),
    owner_id: user?.id ?? null,
  });

  if (error) {
    throw new Error(`登録に失敗しました: ${error.message}`);
  }

  revalidatePath("/companies");
  redirect("/companies");
}

// 取引先カード（法人名・ターゲットブランド・tier・法人URL・リード創出・親会社）の更新。
// 会社詳細ページ・案件詳細ページの両方から呼ぶため、deal_id が渡された時だけその案件も再検証する。
export async function updateCompanyDetails(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("取引先IDが不正です。");
  }
  const name = str(formData.get("name"));
  if (!name) {
    throw new Error("会社名は必須です。");
  }
  const tierValue = String(formData.get("tier") ?? "");
  const targetBrand = str(formData.get("target_brand"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name,
      tier: tierValue in TIER ? (tierValue as Tier) : null,
      target_brand: targetBrand,
      website: str(formData.get("website")),
      lead_source: str(formData.get("lead_source")),
      parent_company: str(formData.get("parent_company")),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }

  revalidatePath(`/companies/${id}`);
  revalidatePath("/companies");
  revalidatePath("/deals");
  const dealId = str(formData.get("deal_id"));
  if (dealId) {
    revalidatePath(`/deals/${dealId}`);
  }
}

export async function createContact(formData: FormData) {
  const companyId = str(formData.get("company_id"));
  if (!companyId) {
    throw new Error("取引先IDが不正です。");
  }

  const name = str(formData.get("name"));
  if (!name) {
    throw new Error("氏名は必須です。");
  }

  const decisionRole = str(formData.get("decision_role"));
  if (decisionRole && !(decisionRole in CONTACT_DECISION_ROLE)) {
    throw new Error("決裁権区分の値が不正です。");
  }

  const leadTime = str(formData.get("lead_time"));
  if (leadTime && !(leadTime in CONTACT_LEAD_TIME)) {
    throw new Error("想定リードタイムの値が不正です。");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contacts").insert({
    company_id: companyId,
    name,
    name_kana: str(formData.get("name_kana")),
    title: str(formData.get("title")),
    email: str(formData.get("email")),
    phone: str(formData.get("phone")),
    decision_role: decisionRole as ContactDecisionRole | null,
    personality: str(formData.get("personality")),
    lead_time: leadTime as ContactLeadTime | null,
    contact_ng_hours: str(formData.get("contact_ng_hours")),
    note: str(formData.get("note")),
  });

  if (error) {
    throw new Error(`登録に失敗しました: ${error.message}`);
  }

  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}`);
}

export async function updateContact(formData: FormData) {
  const id = str(formData.get("id"));
  const companyId = str(formData.get("company_id"));
  if (!id || !companyId) {
    throw new Error("担当者IDが不正です。");
  }

  const name = str(formData.get("name"));
  if (!name) {
    throw new Error("氏名は必須です。");
  }

  const decisionRole = str(formData.get("decision_role"));
  if (decisionRole && !(decisionRole in CONTACT_DECISION_ROLE)) {
    throw new Error("決裁権区分の値が不正です。");
  }

  const leadTime = str(formData.get("lead_time"));
  if (leadTime && !(leadTime in CONTACT_LEAD_TIME)) {
    throw new Error("想定リードタイムの値が不正です。");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update({
      name,
      name_kana: str(formData.get("name_kana")),
      title: str(formData.get("title")),
      email: str(formData.get("email")),
      phone: str(formData.get("phone")),
      decision_role: decisionRole as ContactDecisionRole | null,
      personality: str(formData.get("personality")),
      lead_time: leadTime as ContactLeadTime | null,
      contact_ng_hours: str(formData.get("contact_ng_hours")),
      note: str(formData.get("note")),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }

  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}`);
}
