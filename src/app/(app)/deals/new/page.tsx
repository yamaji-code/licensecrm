import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createDeal } from "../actions";
import { DEAL_CHANNEL, PB_STATUS, type Company, type Partner } from "@/lib/types";

const field =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const labelCls = "block text-sm font-medium text-slate-700";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string | string[] }>;
}) {
  const { company_id } = await searchParams;
  const presetCompanyId = typeof company_id === "string" ? company_id : "";

  const supabase = await createClient();
  const [{ data: companyData }, { data: partnerData }, { data: genreStatData }] =
    await Promise.all([
      supabase.from("companies").select("id, name").order("name", { ascending: true }),
      supabase.from("partners").select("id, name").order("name", { ascending: true }),
      supabase
        .from("genre_stats")
        .select("genre_id, name, is_active, sort_order, contracted_count")
        .order("sort_order", { ascending: true }),
    ]);
  const companies = (companyData ?? []) as Pick<Company, "id" | "name">[];
  const partners = (partnerData ?? []) as Pick<Partner, "id" | "name">[];
  const genreOptions = ((genreStatData ?? []) as {
    genre_id: string;
    name: string;
    is_active: boolean;
    contracted_count: number;
  }[]).filter((g) => g.is_active);

  return (
    <div className="px-8 py-10">
      <div className="mb-6">
        <Link href="/deals" className="text-sm text-slate-500 hover:text-slate-900">
          ← 案件一覧
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">案件を新規登録</h1>
      </div>

      <form
        action={createDeal}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div>
          <label htmlFor="company_id" className={labelCls}>
            取引先 <span className="text-red-500">*</span>
          </label>
          <select
            id="company_id"
            name="company_id"
            required
            defaultValue={presetCompanyId}
            className={field}
          >
            <option value="">（選択してください）</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="title" className={labelCls}>
            案件名 <span className="text-red-500">*</span>
          </label>
          <input id="title" name="title" required className={field} />
        </div>

        <div>
          <label htmlFor="channel" className={labelCls}>
            獲得チャネル <span className="text-red-500">*</span>{" "}
            <span className="font-normal text-slate-400">
              初回接点で決める・後から変えない
            </span>
          </label>
          <select id="channel" name="channel" required defaultValue="" className={field}>
            <option value="">（選択してください）</option>
            {Object.entries(DEAL_CHANNEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="partner_id" className={labelCls}>
            紹介元パートナー{" "}
            <span className="font-normal text-slate-400">
              紹介系チャネルの場合に選択
            </span>
          </label>
          {partners.length > 0 ? (
            <select id="partner_id" name="partner_id" defaultValue="" className={field}>
              <option value="">（なし）</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-400">
              パートナー未登録（紹介元を記録する場合は先にパートナーを登録してください）
            </p>
          )}
        </div>

        <div>
          <label htmlFor="genre_id" className={labelCls}>
            ジャンル{" "}
            <span className="font-normal text-slate-400">
              契約済みジャンルは優先度低（他ジャンルを狙う）
            </span>
          </label>
          {genreOptions.length > 0 ? (
            <select id="genre_id" name="genre_id" defaultValue="" className={field}>
              <option value="">（未設定）</option>
              {genreOptions.map((g) => (
                <option key={g.genre_id} value={g.genre_id}>
                  {g.name}
                  {g.contracted_count > 0 ? "（契約済・優先度低）" : ""}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-400">
              ジャンル未登録（ジャンルマスタ整備後に設定できます）
            </p>
          )}
        </div>

        <div>
          <label htmlFor="pb_status" className={labelCls}>
            PB品の状態{" "}
            <span className="font-normal text-slate-400">商談で確認したら更新</span>
          </label>
          <select id="pb_status" name="pb_status" defaultValue="" className={field}>
            <option value="">（未確認）</option>
            {Object.entries(PB_STATUS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="note" className={labelCls}>
            メモ
          </label>
          <textarea id="note" name="note" rows={3} className={field} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-800"
          >
            登録する
          </button>
          <Link href="/deals" className="text-sm text-slate-500 hover:text-slate-900">
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
