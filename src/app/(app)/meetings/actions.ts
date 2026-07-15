"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  MEETING_FORMAT,
  SCENE_TAG,
  type MeetingFormat,
  type SceneTag,
} from "@/lib/types";

function str(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

// 困りごと入力欄の固定枠数（複数行UIの簡易版）
const PROBLEM_ROW_COUNT = 3;

export async function createMeeting(formData: FormData) {
  const title = str(formData.get("title"));
  if (!title) {
    throw new Error("MTGタイトルは必須です。");
  }

  const format = String(formData.get("format") ?? "");
  if (!(format in MEETING_FORMAT)) {
    throw new Error("区分（オンライン/オフライン）の値が不正です。");
  }

  const heldOn = str(formData.get("held_on"));
  if (!heldOn) {
    throw new Error("実施日は必須です。");
  }

  const dealId = str(formData.get("deal_id"));
  const companyId = str(formData.get("company_id"));

  // 困りごと行（最大3件・固定枠）: 内容が入力された行だけを knowledge_cards へ一括insertする対象にする
  const problemRows: { sceneTag: SceneTag; problem: string }[] = [];
  for (let i = 1; i <= PROBLEM_ROW_COUNT; i++) {
    const problem = str(formData.get(`problem_${i}`));
    if (!problem) continue;
    const sceneTag = String(formData.get(`scene_tag_${i}`) ?? "");
    if (!(sceneTag in SCENE_TAG)) {
      throw new Error(`困りごと${i}件目の場面タグを選択してください。`);
    }
    problemRows.push({ sceneTag: sceneTag as SceneTag, problem });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      title,
      format: format as MeetingFormat,
      held_on: heldOn,
      deal_id: dealId,
      company_id: companyId,
      attendees: str(formData.get("attendees")),
      summary: str(formData.get("summary")),
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`登録に失敗しました: ${error.message}`);
  }

  // 困りごとがあれば knowledge_cards(status='open') を同時作成する（山路確認キューの起点）
  if (problemRows.length > 0) {
    const { error: knowledgeError } = await supabase.from("knowledge_cards").insert(
      problemRows.map((row) => ({
        scene_tag: row.sceneTag,
        problem: row.problem,
        status: "open",
        meeting_id: meeting?.id ?? null,
        deal_id: dealId,
        company_id: companyId,
        requested_by: user?.id ?? null,
      })),
    );
    if (knowledgeError) {
      throw new Error(`困りごとの登録に失敗しました: ${knowledgeError.message}`);
    }
  }

  revalidatePath("/meetings");
  revalidatePath("/knowledge");
  if (dealId) {
    revalidatePath(`/deals/${dealId}`);
    redirect(`/deals/${dealId}`);
  }
  redirect("/meetings");
}
