"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COMPANY_STATUS, type CompanyStatus } from "@/lib/types";

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

  const { error } = await supabase.from("companies").insert({
    name,
    name_kana: str(formData.get("name_kana")),
    status: status as CompanyStatus,
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
