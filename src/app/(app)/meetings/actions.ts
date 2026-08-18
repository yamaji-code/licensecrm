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
    // 場面タグ未選択でも困りごと自体は失わない（その他 として保存し後で分類し直せる）。
    // ここで throw すると入力済みのMTG要旨ごと画面が飛ぶため、救済側に倒す。
    const sceneTagRaw = String(formData.get(`scene_tag_${i}`) ?? "");
    const sceneTag: SceneTag =
      sceneTagRaw in SCENE_TAG ? (sceneTagRaw as SceneTag) : "other";
    problemRows.push({ sceneTag, problem });
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

// 困りごと（knowledge_cards）は編集対象外。同じフォームを流用して再送信すると
// 二重登録になるため、更新は meetings 本体のフィールドのみを対象にする。
export async function updateMeeting(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("MTG IDが指定されていません。");
  }

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

  const supabase = await createClient();
  const { error } = await supabase
    .from("meetings")
    .update({
      title,
      format: format as MeetingFormat,
      held_on: heldOn,
      deal_id: dealId,
      company_id: companyId,
      attendees: str(formData.get("attendees")),
      summary: str(formData.get("summary")),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }

  revalidatePath("/meetings");
  if (dealId) {
    revalidatePath(`/deals/${dealId}`);
    redirect(`/deals/${dealId}`);
  }
  if (companyId) {
    revalidatePath(`/companies/${companyId}`);
  }
  redirect("/meetings");
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// MTG LOGの要旨（markdown）に埋め込む画像。編集中のtextareaから直接呼び出すため
// <form action> は使わず、クライアント側から関数として直接呼び出す想定。
// 戻り値は公開URLの文字列のみ（呼び出し側でmarkdownの画像記法に組み立てる）。
export async function uploadMeetingImage(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("画像ファイルが見つかりません。");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選択してください。");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("画像は8MB以下にしてください。");
  }

  const dealId = str(formData.get("deal_id")) ?? "misc";
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const path = `${dealId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  const supabase = await createClient();
  const { error } = await supabase.storage
    .from("meeting-images")
    .upload(path, file, { contentType: file.type });

  if (error) {
    throw new Error(`画像のアップロードに失敗しました: ${error.message}`);
  }

  const { data } = supabase.storage.from("meeting-images").getPublicUrl(path);
  return data.publicUrl;
}
