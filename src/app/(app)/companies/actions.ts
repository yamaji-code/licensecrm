"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  COMPANY_SIZE,
  COMPANY_STATUS,
  CONTACT_DECISION_ROLE,
  CONTACT_LEAD_TIME,
  type CompanySize,
  type CompanyStatus,
  type ContactDecisionRole,
  type ContactLeadTime,
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

  const sizeValue = String(formData.get("company_size") ?? "");

  const { error } = await supabase.from("companies").insert({
    name,
    name_kana: str(formData.get("name_kana")),
    status: status as CompanyStatus,
    company_size: sizeValue in COMPANY_SIZE ? (sizeValue as CompanySize) : null,
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

// 企業規模（大手/中小）の設定。リードタイムの規模別計測に使う。
// 判定の目安: 直営・FC合計10店舗以上 or 従業員100名以上 or 上場（系列含む）→ 大手
export async function updateCompanySize(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("会社IDが不正です。");
  }
  const sizeValue = String(formData.get("company_size") ?? "");
  const companySize =
    sizeValue in COMPANY_SIZE ? (sizeValue as CompanySize) : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ company_size: companySize })
    .eq("id", id);

  if (error) {
    throw new Error(`企業規模の更新に失敗しました: ${error.message}`);
  }

  revalidatePath(`/companies/${id}`);
  revalidatePath("/companies");
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
