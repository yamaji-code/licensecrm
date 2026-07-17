import Link from "next/link";
import { STAGE_BADGE_STYLE } from "@/components/stage-badge";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createReferral, updatePartner } from "../actions";
import {
  DEAL_CHANNEL,
  DEAL_STAGE,
  PARTNER_TYPE,
  REFERRAL_DIRECTION,
  type Company,
  type Deal,
  type Partner,
  type Referral,
} from "@/lib/types";

const field =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500";
const labelCls = "block text-sm font-medium text-slate-700";

const PARTNER_TYPE_STYLE: Record<string, string> = {
  maker: "bg-blue-100 text-blue-700",
  wholesaler: "bg-indigo-100 text-indigo-700",
  company: "bg-slate-100 text-slate-600",
  customer: "bg-emerald-100 text-emerald-700",
};

// 紹介の方向バッジ（紹介された=もらった側なので緑、紹介した=渡した側なので青）
const DIRECTION_STYLE: Record<string, string> = {
  received: "bg-emerald-100 text-emerald-700",
  given: "bg-blue-100 text-blue-700",
};

type DealRow = Deal & { companies: Pick<Company, "name"> | null };

type ReferralRow = Referral & {
  deals: Pick<Deal, "title"> | null;
  companies: Pick<Company, "name"> | null;
};

type DealOption = Pick<Deal, "id" | "title"> & {
  companies: Pick<Company, "name"> | null;
};

// 発生日の初期値（JST基準の今日）を返す。未入力のまま送信されてもDB側のdefault
// current_dateが効くため必須にはしない。コンポーネント本体に impure な Date 呼び出しを
// 直接書かないよう、モジュールレベルの関数に分離している。
function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const [
    { data: partnerData, error: partnerError },
    { data: dealData },
    { data: referralData },
    { data: companyOptionData },
    { data: dealOptionData },
  ] = await Promise.all([
    supabase.from("partners").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("deals")
      .select("*, companies ( name )")
      .eq("partner_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("referrals")
      .select("*, deals ( title ), companies ( name )")
      .eq("partner_id", id)
      .order("occurred_on", { ascending: false }),
    supabase.from("companies").select("id, name").order("name", { ascending: true }),
    supabase
      .from("deals")
      .select("*, companies ( name )")
      .order("created_at", { ascending: false }),
  ]);

  if (partnerError || !partnerData) {
    notFound();
  }

  const partner = partnerData as Partner;
  const deals = (dealData ?? []) as DealRow[];
  const referrals = (referralData ?? []) as ReferralRow[];
  const companyOptions = (companyOptionData ?? []) as Pick<Company, "id" | "name">[];
  const dealOptions = (dealOptionData ?? []) as DealOption[];

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <div className="mb-6">
        <Link href="/partners" className="text-sm text-slate-500 hover:text-slate-900">
          ← パートナー一覧
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{partner.name}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              PARTNER_TYPE_STYLE[partner.partner_type]
            }`}
          >
            {PARTNER_TYPE[partner.partner_type]}
          </span>
        </div>
        {partner.name_kana && (
          <p className="mt-1 text-sm text-slate-400">{partner.name_kana}</p>
        )}
      </div>

      {/* 基本情報（編集可） */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-medium text-slate-500">基本情報</h2>
        <form action={updatePartner} className="space-y-5">
          <input type="hidden" name="id" value={partner.id} />

          <div>
            <label htmlFor="name" className={labelCls}>
              パートナー名 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={partner.name}
              className={field}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="name_kana" className={labelCls}>
                パートナー名（かな）
              </label>
              <input
                id="name_kana"
                name="name_kana"
                defaultValue={partner.name_kana ?? ""}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="partner_type" className={labelCls}>
                種別
              </label>
              <select
                id="partner_type"
                name="partner_type"
                defaultValue={partner.partner_type}
                className={field}
              >
                {Object.entries(PARTNER_TYPE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="contact_name" className={labelCls}>
                窓口担当者名
              </label>
              <input
                id="contact_name"
                name="contact_name"
                defaultValue={partner.contact_name ?? ""}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="phone" className={labelCls}>
                電話番号
              </label>
              <input
                id="phone"
                name="phone"
                defaultValue={partner.phone ?? ""}
                className={field}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className={labelCls}>
              メール
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={partner.email ?? ""}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="note" className={labelCls}>
              メモ
            </label>
            <textarea
              id="note"
              name="note"
              rows={3}
              defaultValue={partner.note ?? ""}
              className={field}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              更新する
            </button>
          </div>
        </form>
      </section>

      {/* 紐づく案件 */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-medium text-slate-500">
          紐づく案件 {deals.length} 件
        </h2>
        {deals.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {deals.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <Link
                    href={`/deals/${d.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {d.title}
                  </Link>
                  <p className="text-xs text-slate-400">
                    <Link href={`/companies/${d.company_id}`} className="hover:underline">
                      {d.companies?.name ?? "—"}
                    </Link>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STAGE_BADGE_STYLE[d.stage]
                    }`}
                  >
                    {DEAL_STAGE[d.stage]}
                  </span>
                  <span className="text-xs text-slate-400">{DEAL_CHANNEL[d.channel]}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">
            紐づく案件はまだありません。
          </p>
        )}
      </section>

      {/* 紹介記録一覧（received / given 両方向） */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-medium text-slate-500">
          紹介記録 {referrals.length} 件
        </h2>
        {referrals.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {referrals.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      DIRECTION_STYLE[r.direction]
                    }`}
                  >
                    {REFERRAL_DIRECTION[r.direction]}
                  </span>
                  <span className="text-xs text-slate-400">{r.occurred_on}</span>
                  {r.deal_id && (
                    <Link
                      href={`/deals/${r.deal_id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {r.deals?.title ?? "案件"}
                    </Link>
                  )}
                  {r.company_id && !r.deal_id && (
                    <Link
                      href={`/companies/${r.company_id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {r.companies?.name ?? "取引先"}
                    </Link>
                  )}
                </div>
                {r.note && <p className="mt-1 text-xs text-slate-500">{r.note}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">
            紹介記録はまだありません。
          </p>
        )}
      </section>

      {/* 紹介記録の追加フォーム */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-medium text-slate-500">紹介記録を追加</h2>
        <form action={createReferral} className="space-y-5">
          <input type="hidden" name="partner_id" value={partner.id} />

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="direction" className={labelCls}>
                方向 <span className="text-red-500">*</span>
              </label>
              <select id="direction" name="direction" required defaultValue="" className={field}>
                <option value="">（選択してください）</option>
                {Object.entries(REFERRAL_DIRECTION).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="occurred_on" className={labelCls}>
                発生日
              </label>
              <input
                id="occurred_on"
                name="occurred_on"
                type="date"
                defaultValue={todayJst()}
                className={field}
              />
            </div>
          </div>

          <div>
            <label htmlFor="deal_id" className={labelCls}>
              関連する案件{" "}
              <span className="font-normal text-slate-400">任意</span>
            </label>
            <select id="deal_id" name="deal_id" defaultValue="" className={field}>
              <option value="">（なし）</option>
              {dealOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.companies?.name ? `${d.companies.name} / ${d.title}` : d.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="company_id" className={labelCls}>
              関連する取引先{" "}
              <span className="font-normal text-slate-400">任意</span>
            </label>
            <select id="company_id" name="company_id" defaultValue="" className={field}>
              <option value="">（なし）</option>
              {companyOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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

          <div className="pt-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              記録を追加
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
