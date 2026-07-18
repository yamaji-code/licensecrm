import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  PARTNER_TYPE,
  type DealKpiFact,
  type Partner,
  type Referral,
} from "@/lib/types";

const PARTNER_TYPE_STYLE: Record<string, string> = {
  maker: "bg-blue-100 text-blue-700",
  wholesaler: "bg-indigo-100 text-indigo-700",
  company: "bg-slate-100 text-slate-600",
  customer: "bg-emerald-100 text-emerald-700",
};

// 分母が 0 のときは "—" にしてゼロ除算エラー・NaN 表示を避ける
function formatRate(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

type PartnerStat = { received: number; given: number; dealIds: Set<string> };

export default async function PartnersPage() {
  const supabase = await createClient();

  const [
    { data: partnerData, error },
    { data: referralData },
    { data: kpiFactsData },
  ] = await Promise.all([
    supabase.from("partners").select("*").order("created_at", { ascending: false }),
    supabase.from("referrals").select("partner_id, direction, deal_id"),
    // 成約判定は KPI ビュー（deal_kpi_facts）の first_contract_at を正とする
    supabase.from("deal_kpi_facts").select("deal_id, first_contract_at"),
  ]);

  const partners = (partnerData ?? []) as Partner[];
  const referrals = (referralData ?? []) as Pick<
    Referral,
    "partner_id" | "direction" | "deal_id"
  >[];
  const kpiFacts = (kpiFactsData ?? []) as Pick<
    DealKpiFact,
    "deal_id" | "first_contract_at"
  >[];

  // referrals → deal_id → deal_kpi_facts を JS 側で JOIN 的に集計する
  const contractedDealIds = new Set(
    kpiFacts.filter((f) => f.first_contract_at !== null).map((f) => f.deal_id),
  );

  const statsByPartnerId = new Map<string, PartnerStat>();
  for (const p of partners) {
    statsByPartnerId.set(p.id, { received: 0, given: 0, dealIds: new Set() });
  }
  for (const r of referrals) {
    const s = statsByPartnerId.get(r.partner_id);
    if (!s) continue;
    if (r.direction === "received") s.received += 1;
    if (r.direction === "given") s.given += 1;
    // 「紹介経由の案件・成約率」は received（このパートナーから紹介された）案件のみを母数にする。
    // given（こちらが紹介した先）に deal_id が付いても成約率に混ぜない。
    if (r.direction === "received" && r.deal_id) s.dealIds.add(r.deal_id);
  }

  return (
    <div className="px-8 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">パートナー</h1>
          <p className="mt-1 text-sm text-slate-500">{partners.length} 社</p>
        </div>
        <Link
          href="/partners/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          + 新規登録
        </Link>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          読み込みエラー: {error.message}（マイグレーション未実行の可能性があります）
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {partners.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-5 py-3 font-medium">パートナー名</th>
                <th className="px-5 py-3 font-medium">種別</th>
                <th className="px-5 py-3 font-medium">紹介された</th>
                <th className="px-5 py-3 font-medium">紹介した</th>
                <th className="px-5 py-3 font-medium">紹介経由の案件</th>
                <th className="px-5 py-3 font-medium">成約率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners.map((p) => {
                const s = statsByPartnerId.get(p.id) ?? {
                  received: 0,
                  given: 0,
                  dealIds: new Set<string>(),
                };
                const dealCount = s.dealIds.size;
                const contractedCount = [...s.dealIds].filter((id) =>
                  contractedDealIds.has(id),
                ).length;
                return (
                  <tr key={p.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/partners/${p.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.name_kana && (
                        <p className="text-xs text-slate-400">{p.name_kana}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          PARTNER_TYPE_STYLE[p.partner_type]
                        }`}
                      >
                        {PARTNER_TYPE[p.partner_type]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{s.received} 件</td>
                    <td className="px-5 py-3 text-slate-600">{s.given} 件</td>
                    <td className="px-5 py-3 text-slate-600">
                      {dealCount} 件（成約 {contractedCount} 件）
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatRate(contractedCount, dealCount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            まだパートナーが登録されていません。「新規登録」から追加してください。
          </p>
        )}
      </div>
    </div>
  );
}
