"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEAL_CHANNEL,
  DEAL_STAGE,
  DEAL_STAGE_ORDER,
  PB_STATUS,
  REFERRAL_CHANNELS,
  type DealChannel,
  type DealStage,
  type PbStatus,
} from "@/lib/types";

// ボードの表示密度（標準/コンパクト）を cookie に保存する。
// URLパラメータでなく cookie にする理由: サイドバーから /deals に戻っても選択が残るように。
export async function setBoardDensity(formData: FormData) {
  const density = String(formData.get("density") ?? "");
  const value = density === "compact" ? "compact" : "comfortable";
  const cookieStore = await cookies();
  cookieStore.set("board_density", value, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/deals");
}

// フォーム値から pb_status を検証して返す（不正値・未指定は null）
// Object.hasOwn を使う（`in` は prototype のキー(toString 等)も真になり許可リストを迂回するため）
function parsePbStatus(value: FormDataEntryValue | null): PbStatus | null {
  const s = typeof value === "string" ? value : "";
  return Object.hasOwn(PB_STATUS, s) ? (s as PbStatus) : null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// フォーム値から genre_id を検証して返す（uuid 形式でなければ null）。
// FK 制約が最終防波堤だが、pb_status と同様にアプリ層でも検証し不正値で生の DB エラーを露出させない。
function parseGenreId(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return UUID_RE.test(s) ? s : null;
}

// JST 基準で「今日 + offset 日」の日付文字列（YYYY-MM-DD）を返す
function jstDatePlusDays(offsetDays: number): string {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  return new Date(Date.now() + JST_OFFSET_MS + offsetDays * 86400000)
    .toISOString()
    .slice(0, 10);
}

// ステージ入場時のタスク雛形展開（advanceDealStage / changeDealStage / applyStageTemplates 共通）。
// 冪等: 同一案件×同一雛形は tasks の一意インデックス (deal_id, template_id) が二重展開を防ぎ、
// アプリ側でも展開済み template_id を除外してから insert する。戻り値 = 追加した件数。
async function expandStageTemplates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dealId: string,
  companyId: string | null,
  stage: DealStage,
): Promise<number> {
  const { data: templates, error: templateError } = await supabase
    .from("stage_task_templates")
    .select("id, title, department, due_offset_days")
    .eq("stage", stage)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (templateError) {
    throw new Error(`タスク雛形の取得に失敗しました: ${templateError.message}`);
  }
  if (!templates || templates.length === 0) {
    return 0;
  }

  const { data: existing, error: existingError } = await supabase
    .from("tasks")
    .select("template_id")
    .eq("deal_id", dealId)
    .not("template_id", "is", null);
  if (existingError) {
    throw new Error(`既存タスクの確認に失敗しました: ${existingError.message}`);
  }
  const expanded = new Set((existing ?? []).map((t) => t.template_id as string));
  const rows = templates
    .filter((t) => !expanded.has(t.id as string))
    .map((t) => ({
      title: t.title as string,
      status: "todo",
      deal_id: dealId,
      company_id: companyId,
      template_id: t.id as string,
      department: t.department as string,
      due_date: jstDatePlusDays((t.due_offset_days as number) ?? 7),
    }));
  if (rows.length === 0) {
    return 0;
  }

  // 1件ずつ挿入する（バッチだと1行でも一意制約(23505)に当たると全行ロールバックし、
  // 同時展開が起きたとき本当に新規な行まで失われる）。件数は最大でも数件なので並列で十分。
  // 23505 = すでに他の展開が入れた行 → 無害なのでスキップしてカウントしない。
  const inserted = await Promise.all(
    rows.map((row) =>
      supabase
        .from("tasks")
        .insert(row)
        .then(({ error }) => {
          if (error && error.code !== "23505") {
            throw new Error(
              `雛形タスクの作成に失敗しました: ${error.message}`,
            );
          }
          return error ? 0 : 1;
        }),
    ),
  );
  return inserted.reduce<number>((sum, n) => sum + n, 0);
}

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
  if (!Object.hasOwn(DEAL_CHANNEL, channel)) {
    throw new Error("獲得チャネルの値が不正です。");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const partnerId = str(formData.get("partner_id"));

  // stage は DB デフォルトの 'sourced' で作成する。
  // stage_events への初回記録は deals の DB トリガーが行うため、ここでは書かない。
  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      company_id: companyId,
      title,
      channel: channel as DealChannel,
      partner_id: partnerId,
      genre_id: parseGenreId(formData.get("genre_id")),
      pb_status: parsePbStatus(formData.get("pb_status")),
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
    .update({
      note: str(formData.get("note")),
      genre_id: parseGenreId(formData.get("genre_id")),
      pb_status: parsePbStatus(formData.get("pb_status")),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`更新に失敗しました: ${error.message}`);
  }

  revalidatePath(`/deals/${id}`);
  redirect(`/deals/${id}`);
}

// カンバンボードの「→ 次へ」用。必須タスク（雛形の is_required / 手動作成タスク）が
// 全完了している案件だけを、パイプライン順の次ステージへ進める。
// 任意タスク（雛形の is_required=false）は残っていても進める。
// タスク0件の案件は従来どおりブロック（雛形未展開の移行案件は「雛形を適用」から）。
// 条件はサーバー側で再検証する（クライアント改ざん・競合状態への防御）。
export async function advanceDealStage(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("案件IDが不正です。");
  }

  const supabase = await createClient();

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, stage, company_id")
    .eq("id", id)
    .single();
  if (dealError || !deal) {
    throw new Error("案件が見つかりませんでした。");
  }

  // ボード表示時とサーバー処理時でステージが食い違ったら進めない（二重サブミット対策）
  const fromStage = str(formData.get("from_stage"));
  if (fromStage && fromStage !== deal.stage) {
    throw new Error("既に他の画面でステージが変わっています。再読み込みしてください。");
  }

  // パイプライン順で次ステージを求める。進行外（nurturing/lost）や末尾（sv_ready）は進めない。
  const currentIndex = DEAL_STAGE_ORDER.indexOf(deal.stage as DealStage);
  if (currentIndex < 0 || currentIndex >= DEAL_STAGE_ORDER.length - 1) {
    throw new Error("この案件は次のステージへ進められません。");
  }
  const nextStage = DEAL_STAGE_ORDER[currentIndex + 1];

  // 必須タスク全完了の再検証。
  // 必須 = 手動作成タスク（template_id なし）+ 雛形タスクの is_required=true。
  const { data: tasks, error: taskError } = await supabase
    .from("tasks")
    .select("status, template_id, stage_task_templates ( is_required )")
    .eq("deal_id", id);
  if (taskError) {
    throw new Error(`タスクの確認に失敗しました: ${taskError.message}`);
  }
  const total = tasks?.length ?? 0;
  const openRequired = (tasks ?? []).filter((t) => {
    if (t.status === "done") return false;
    // to-one 埋め込みは実行時オブジェクト（型推論は配列になるため unknown 経由でキャスト）
    const tmpl = t.stage_task_templates as unknown as {
      is_required: boolean;
    } | null;
    return t.template_id === null || tmpl?.is_required !== false;
  }).length;
  if (total === 0 || openRequired > 0) {
    throw new Error(
      "必須タスクが完了していないため、次のステージへ進められません。",
    );
  }

  // 楽観ロック付き更新: 現ステージのままの行だけを更新（同時進行なら0行更新=エラー）。
  // stage_events への記録は DB トリガー（log_stage_event）が自動で行う。
  const { data: updated, error } = await supabase
    .from("deals")
    .update({ stage: nextStage })
    .eq("id", id)
    .eq("stage", deal.stage)
    .select("id");
  if (error) {
    throw new Error(`ステージ変更に失敗しました: ${error.message}`);
  }
  if (!updated || updated.length === 0) {
    throw new Error("既に他の画面でステージが変わっています。再読み込みしてください。");
  }

  // 新ステージのタスク雛形を自動展開（展開済み分は除外・二重展開はDBの一意制約でも防止）
  const added = await expandStageTemplates(
    supabase,
    id,
    deal.company_id as string | null,
    nextStage,
  );

  revalidatePath("/deals");
  redirect(`/deals?advanced=${id}&to=${nextStage}&added=${added}`);
}

// 案件詳細の「雛形を適用」用。現ステージの雛形タスクを後から展開する
// （移行案件などタスク0件のままステージに滞在している案件の救済）。
export async function applyStageTemplates(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("案件IDが不正です。");
  }

  const supabase = await createClient();
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, stage, company_id")
    .eq("id", id)
    .single();
  if (dealError || !deal) {
    throw new Error("案件が見つかりませんでした。");
  }

  await expandStageTemplates(
    supabase,
    id,
    deal.company_id as string | null,
    deal.stage as DealStage,
  );

  revalidatePath(`/deals/${id}`);
  revalidatePath("/deals");
  redirect(`/deals/${id}`);
}

export async function changeDealStage(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) {
    throw new Error("案件IDが不正です。");
  }

  const stage = String(formData.get("stage") ?? "");
  if (!Object.hasOwn(DEAL_STAGE, stage)) {
    throw new Error("ステージの値が不正です。");
  }

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("deals")
    .select("id, stage, company_id")
    .eq("id", id)
    .single();
  if (currentError || !current) {
    throw new Error("案件が見つかりませんでした。");
  }

  // stage_events への記録は DB トリガー（log_stage_event）が自動で行う。
  // stage_events は RLS で直接 insert が禁止されているため、ここでは deals.stage の update のみ行う。
  const { error } = await supabase
    .from("deals")
    .update({ stage: stage as DealStage })
    .eq("id", id);

  if (error) {
    throw new Error(`ステージ変更に失敗しました: ${error.message}`);
  }

  // 雛形展開: 前方移動（パイプライン順で前進）と nurturing（再アプローチ管理タスク）のみ。
  // 後退・lost への移動では展開しない。
  const fromIndex = DEAL_STAGE_ORDER.indexOf(current.stage as DealStage);
  const toIndex = DEAL_STAGE_ORDER.indexOf(stage as DealStage);
  const isForward = toIndex >= 0 && toIndex > fromIndex;
  if (isForward || stage === "nurturing") {
    await expandStageTemplates(
      supabase,
      id,
      current.company_id as string | null,
      stage as DealStage,
    );
  }

  revalidatePath(`/deals/${id}`);
  revalidatePath("/deals");
  redirect(`/deals/${id}`);
}

// ボードのドラッグ&ドロップ用。カードを任意のステージ列へ落として移動する。
// 手動移動なのでタスク完了ゲートは課さない（詳細ページのプルダウンと同じ扱い）。
// 前方移動と時期見送りでは雛形を展開し、ボードに留まる（redirect しない）。
export async function moveDealToStage(dealId: string, toStage: string) {
  if (!dealId) {
    throw new Error("案件IDが不正です。");
  }
  if (!Object.hasOwn(DEAL_STAGE, toStage)) {
    throw new Error("ステージの値が不正です。");
  }

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("deals")
    .select("id, stage, company_id")
    .eq("id", dealId)
    .single();
  if (currentError || !current) {
    throw new Error("案件が見つかりませんでした。");
  }
  // 同じ列に落とした場合は何もしない（並び替えは非対応）
  if (current.stage === toStage) {
    return;
  }

  const { error } = await supabase
    .from("deals")
    .update({ stage: toStage as DealStage })
    .eq("id", dealId);
  if (error) {
    throw new Error(`ステージ変更に失敗しました: ${error.message}`);
  }

  const fromIndex = DEAL_STAGE_ORDER.indexOf(current.stage as DealStage);
  const toIndex = DEAL_STAGE_ORDER.indexOf(toStage as DealStage);
  const isForward = toIndex >= 0 && toIndex > fromIndex;
  if (isForward || toStage === "nurturing") {
    await expandStageTemplates(
      supabase,
      dealId,
      current.company_id as string | null,
      toStage as DealStage,
    );
  }

  revalidatePath("/deals");
}
