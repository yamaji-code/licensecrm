import { PARTNER_TYPE_STYLE } from "@/components/badges";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
// 分母 0 を "—" に落とす成約率の整形は KPI 側と同一実装なので共通関数を使う
import { formatRate } from "@/lib/kpi";
import {
  ButtonLink,
  Card,
  EmptyState,
  LoadErrorBanner,
  PageHeader,
  PageShell,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";
import {
  PARTNER_TYPE,
  type DealKpiFact,
  type Partner,
  type Referral,
} from "@/lib/types";

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

  // 表とカードで同じ値を出すため、行の描画に必要な値をここで一度だけ確定させる
  const rows = partners.map((p) => {
    const s = statsByPartnerId.get(p.id) ?? {
      received: 0,
      given: 0,
      dealIds: new Set<string>(),
    };
    const dealCount = s.dealIds.size;
    const contractedCount = [...s.dealIds].filter((id) =>
      contractedDealIds.has(id),
    ).length;
    return {
      partner: p,
      received: s.received,
      given: s.given,
      dealCount,
      contractedCount,
      rate: formatRate(contractedCount, dealCount),
    };
  });

  return (
    <PageShell>
      <PageHeader
        title="パートナー"
        meta={`${partners.length} 社`}
        actions={
          <ButtonLink href="/partners/new" variant="primary">
            新規登録
          </ButtonLink>
        }
      />

      {error && (
        <div className="mb-4">
          <LoadErrorBanner
            message={`${error.message}（マイグレーション未実行の可能性があります）`}
          />
        </div>
      )}

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title="まだパートナーが登録されていません"
            description="紹介元・紹介先のメーカーや卸を登録すると、紹介の往来と紹介経由の成約率を追えます。"
            action={
              <ButtonLink href="/partners/new" variant="primary" size="sm">
                最初のパートナーを登録
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <>
          {/* 広い画面は表。和文は列が潰れると縦積みになって読めなくなるため、
              狭い画面ではカードに落とす（表の横スクロールより読みやすい） */}
          <Card className="hidden sm:block">
            <Table caption="パートナーの一覧と紹介実績">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>パートナー名</TH>
                  <TH>種別</TH>
                  <TH numeric>紹介された</TH>
                  <TH numeric>紹介した</TH>
                  <TH>紹介経由の案件</TH>
                  <TH numeric>成約率</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => (
                  <TR key={row.partner.id}>
                    <TD>
                      <Link
                        href={`/partners/${row.partner.id}`}
                        className="font-medium text-ink hover:text-brand-700 hover:underline"
                      >
                        {row.partner.name}
                      </Link>
                      {row.partner.name_kana && (
                        <p className="text-xs text-ink-faint">
                          {row.partner.name_kana}
                        </p>
                      )}
                    </TD>
                    <TD>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          PARTNER_TYPE_STYLE[row.partner.partner_type]
                        }`}
                      >
                        {PARTNER_TYPE[row.partner.partner_type]}
                      </span>
                    </TD>
                    <TD numeric className="text-ink-soft">
                      {row.received} 件
                    </TD>
                    <TD numeric className="text-ink-soft">
                      {row.given} 件
                    </TD>
                    <TD className="text-ink-soft">
                      {row.dealCount} 件（成約 {row.contractedCount} 件）
                    </TD>
                    <TD numeric className="text-ink-soft">
                      {row.rate}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <ul className="space-y-2 sm:hidden">
            {rows.map((row) => (
              <li key={row.partner.id}>
                <Link
                  href={`/partners/${row.partner.id}`}
                  className="block rounded-card border border-line bg-white px-4 py-3 shadow-card transition-colors hover:border-brand-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block font-medium text-ink">
                        {row.partner.name}
                      </span>
                      {row.partner.name_kana && (
                        <span className="block text-xs text-ink-faint">
                          {row.partner.name_kana}
                        </span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        PARTNER_TYPE_STYLE[row.partner.partner_type]
                      }`}
                    >
                      {PARTNER_TYPE[row.partner.partner_type]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    紹介された {row.received} 件 ・ 紹介した {row.given} 件
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    紹介経由の案件 {row.dealCount} 件（成約 {row.contractedCount} 件）
                    ・ 成約率 {row.rate}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageShell>
  );
}
