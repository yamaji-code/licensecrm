import {
  PARTNER_RANK_STYLE,
  PARTNER_STAGE_STYLE,
  REFERRAL_DIRECTION_STYLE,
} from "@/components/badges";
import Link from "next/link";
import { STAGE_BADGE_STYLE } from "@/components/stage-badge";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createReferral, updatePartner, updatePartnerStage } from "../actions";
import {
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  FormActions,
  Input,
  PageHeader,
  PageShell,
  Select,
  SubmitButton,
  Textarea,
} from "@/components/ui";
import {
  DEAL_CHANNEL,
  DEAL_STAGE,
  PARTNER_RANK,
  PARTNER_STAGE,
  REFERRAL_DIRECTION,
  type Company,
  type Deal,
  type Partner,
  type Referral,
} from "@/lib/types";

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
    <PageShell>
      <PageHeader
        title={partner.name}
        meta={
          <span className="flex items-center gap-1.5">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                PARTNER_STAGE_STYLE[partner.stage]
              }`}
            >
              {PARTNER_STAGE[partner.stage]}
            </span>
            {partner.rank && (
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  PARTNER_RANK_STYLE[partner.rank]
                }`}
              >
                ランク {PARTNER_RANK[partner.rank]}
              </span>
            )}
          </span>
        }
        description={partner.company_name ?? undefined}
        back={
          <Link
            href="/partners"
            className="text-ink-soft transition-colors hover:text-brand-700"
          >
            ← パートナー一覧
          </Link>
        }
      />

      <div className="space-y-6">
        {/* ステータス（看板の列に相当）はここだけで素早く切り替える */}
        <Card>
          <CardBody className="flex flex-wrap items-center gap-3">
            <form action={updatePartnerStage} className="flex items-center gap-2">
              <input type="hidden" name="id" value={partner.id} />
              <Field htmlFor="stage" label="ステータス">
                <Select id="stage" name="stage" defaultValue={partner.stage}>
                  {Object.entries(PARTNER_STAGE).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <SubmitButton size="sm" pendingLabel="変更中…">
                変更
              </SubmitButton>
            </form>
          </CardBody>
        </Card>

        {/* 基本情報（編集可） */}
        <Card>
          <CardHeader title="基本情報" />
          <CardBody>
            <form action={updatePartner} className="space-y-5">
              <input type="hidden" name="id" value={partner.id} />

              <Field htmlFor="name" label="名前" required>
                <Input id="name" name="name" required defaultValue={partner.name} />
              </Field>

              <Field htmlFor="company_name" label="法人名">
                <Input
                  id="company_name"
                  name="company_name"
                  defaultValue={partner.company_name ?? ""}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field htmlFor="phone" label="電話番号">
                  <Input id="phone" name="phone" defaultValue={partner.phone ?? ""} />
                </Field>
                <Field htmlFor="email" label="メールアドレス">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={partner.email ?? ""}
                  />
                </Field>
              </div>

              <Field htmlFor="referred_by" label="誰からの紹介か">
                <Input
                  id="referred_by"
                  name="referred_by"
                  defaultValue={partner.referred_by ?? ""}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field htmlFor="specialty" label="得意領域">
                  <Input
                    id="specialty"
                    name="specialty"
                    defaultValue={partner.specialty ?? ""}
                  />
                </Field>
                <Field htmlFor="rank" label="ランク">
                  <Select id="rank" name="rank" defaultValue={partner.rank ?? ""}>
                    <option value="">（未設定）</option>
                    {Object.entries(PARTNER_RANK).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field htmlFor="referral_fee" label="紹介手数料">
                <Input
                  id="referral_fee"
                  name="referral_fee"
                  placeholder="例: 契約額の10%"
                  defaultValue={partner.referral_fee ?? ""}
                />
              </Field>

              <Field htmlFor="note" label="メモ">
                <Textarea
                  id="note"
                  name="note"
                  rows={3}
                  defaultValue={partner.note ?? ""}
                />
              </Field>

              <FormActions>
                <SubmitButton pendingLabel="更新中…">更新する</SubmitButton>
              </FormActions>
            </form>
          </CardBody>
        </Card>

        {/* 紐づく案件 */}
        <Card>
          <CardHeader title={`紐づく案件 ${deals.length} 件`} />
          {deals.length > 0 ? (
            <CardBody>
              <ul className="divide-y divide-line">
                {deals.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/deals/${d.id}`}
                        className="font-medium text-ink hover:text-brand-700 hover:underline"
                      >
                        {d.title}
                      </Link>
                      <p className="text-xs text-ink-faint">
                        <Link
                          href={`/companies/${d.company_id}`}
                          className="hover:text-brand-700 hover:underline"
                        >
                          {d.companies?.name ?? "—"}
                        </Link>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          STAGE_BADGE_STYLE[d.stage]
                        }`}
                      >
                        {DEAL_STAGE[d.stage]}
                      </span>
                      <span className="text-xs text-ink-faint">
                        {d.channel.map((c) => DEAL_CHANNEL[c]).join("・")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          ) : (
            <EmptyState
              title="まだ紐づく案件がありません"
              description="このパートナーが関わる案件を登録すると、紹介経由の成約率に反映されます。"
              action={
                <ButtonLink href="/deals/new" size="sm">
                  案件を登録
                </ButtonLink>
              }
            />
          )}
        </Card>

        {/* 紹介記録一覧（received / given 両方向） */}
        <Card>
          <CardHeader title={`紹介記録 ${referrals.length} 件`} />
          {referrals.length > 0 ? (
            <CardBody>
              <ul className="divide-y divide-line">
                {referrals.map((r) => (
                  <li key={r.id} className="py-3 text-sm first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          REFERRAL_DIRECTION_STYLE[r.direction]
                        }`}
                      >
                        {REFERRAL_DIRECTION[r.direction]}
                      </span>
                      <span className="text-xs text-ink-faint">{r.occurred_on}</span>
                      {r.deal_id && (
                        <Link
                          href={`/deals/${r.deal_id}`}
                          className="font-medium text-ink hover:text-brand-700 hover:underline"
                        >
                          {r.deals?.title ?? "案件"}
                        </Link>
                      )}
                      {r.company_id && !r.deal_id && (
                        <Link
                          href={`/companies/${r.company_id}`}
                          className="font-medium text-ink hover:text-brand-700 hover:underline"
                        >
                          {r.companies?.name ?? "取引先"}
                        </Link>
                      )}
                    </div>
                    {r.note && <p className="mt-1 text-xs text-ink-soft">{r.note}</p>}
                  </li>
                ))}
              </ul>
            </CardBody>
          ) : (
            <EmptyState
              title="まだ紹介記録がありません"
              description="紹介された・紹介した実績を残すと、このパートナーの貢献度を数字で追えます。"
              action={
                <ButtonLink href="#referral-form" size="sm">
                  最初の紹介記録を追加
                </ButtonLink>
              }
            />
          )}
        </Card>

        {/* 紹介記録の追加フォーム */}
        <Card>
          <div id="referral-form" className="scroll-mt-4">
            <CardHeader title="紹介記録を追加" />
          </div>
          <CardBody>
            <form action={createReferral} className="space-y-5">
              <input type="hidden" name="partner_id" value={partner.id} />

              <div className="grid gap-5 sm:grid-cols-2">
                <Field htmlFor="direction" label="方向" required>
                  <Select id="direction" name="direction" required defaultValue="">
                    <option value="">（選択してください）</option>
                    {Object.entries(REFERRAL_DIRECTION).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field htmlFor="occurred_on" label="発生日">
                  <Input
                    id="occurred_on"
                    name="occurred_on"
                    type="date"
                    defaultValue={todayJst()}
                  />
                </Field>
              </div>

              <Field htmlFor="deal_id" label="関連する案件">
                <Select id="deal_id" name="deal_id" defaultValue="">
                  <option value="">（なし）</option>
                  {dealOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.companies?.name ? `${d.companies.name} / ${d.title}` : d.title}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field htmlFor="company_id" label="関連する取引先">
                <Select id="company_id" name="company_id" defaultValue="">
                  <option value="">（なし）</option>
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* id は基本情報フォームの note と重複させない（label の紐づけが壊れるため）。
                  送信キーになる name は変更しない */}
              <Field htmlFor="referral_note" label="メモ">
                <Textarea id="referral_note" name="note" rows={3} />
              </Field>

              <FormActions>
                <SubmitButton pendingLabel="追加中…">記録を追加</SubmitButton>
              </FormActions>
            </form>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
