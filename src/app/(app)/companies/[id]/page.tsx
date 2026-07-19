import { COMPANY_STATUS_STYLE, DECISION_ROLE_STYLE } from "@/components/badges";
import Link from "next/link";
import { STAGE_BADGE_STYLE } from "@/components/stage-badge";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateCompanySize } from "../actions";
import {
  Banner,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  DescItem,
  DescList,
  EmptyState,
  Field,
  PageHeader,
  PageShell,
  Select,
  SubmitButton,
} from "@/components/ui";
import {
  COMPANY_SIZE,
  COMPANY_STATUS,
  CONTACT_DECISION_ROLE,
  CONTACT_DECISION_ROLE_MARK,
  CONTACT_LEAD_TIME,
  DEAL_CHANNEL,
  DEAL_STAGE,
  type Company,
  type Contact,
  type Deal,
} from "@/lib/types";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const [
    { data: companyData, error: companyError },
    { data: contactData },
    { data: dealData },
  ] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("contacts")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("deals")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (companyError || !companyData) {
    notFound();
  }

  const company = companyData as Company;
  const contacts = (contactData ?? []) as Contact[];
  const deals = (dealData ?? []) as Deal[];

  return (
    <PageShell>
      <PageHeader
        title={company.name}
        meta={
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              COMPANY_STATUS_STYLE[company.status]
            }`}
          >
            {COMPANY_STATUS[company.status]}
          </span>
        }
        description={company.name_kana || undefined}
        back={
          <Link
            href="/companies"
            className="text-ink-soft hover:text-brand-700 hover:underline"
          >
            ← 取引先一覧
          </Link>
        }
      />

      {/* 広い画面は2カラム。左＝案件・担当者（動く実体）／右＝会社の属性情報。
          狭い画面では従来どおり「基本情報 → 担当者 → 案件」の縦積みになる */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 会社基本情報（広い画面では右レール） */}
        <div className="lg:order-2 lg:col-span-1">
          <Card>
            <CardHeader title="基本情報" />
            <CardBody className="space-y-5">
              <form action={updateCompanySize}>
                <input type="hidden" name="id" value={company.id} />
                <Field
                  htmlFor="company_size"
                  label="企業規模"
                  hint="国内店舗数 30店舗以上は大手（2026-07-20 山路さん確定）"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      id="company_size"
                      name="company_size"
                      defaultValue={company.company_size ?? ""}
                      className="min-w-40 flex-1"
                    >
                      <option value="">未設定</option>
                      {Object.entries(COMPANY_SIZE).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <SubmitButton
                      variant="secondary"
                      size="sm"
                      pendingLabel="保存中…"
                    >
                      保存
                    </SubmitButton>
                  </div>
                </Field>
              </form>

              <DescList>
                <DescItem label="業種">{company.industry ?? "—"}</DescItem>
                <DescItem label="電話番号">{company.phone ?? "—"}</DescItem>
                <DescItem label="Web サイト">{company.website ?? "—"}</DescItem>
                <DescItem label="住所">{company.address ?? "—"}</DescItem>
                {company.note && (
                  <DescItem label="メモ">
                    <span className="whitespace-pre-wrap">{company.note}</span>
                  </DescItem>
                )}
              </DescList>
            </CardBody>
          </Card>
        </div>

        {/* 担当者・案件（広い画面では左のメイン列） */}
        <div className="space-y-6 lg:order-1 lg:col-span-2">
          {/* 担当者一覧（人物情報カード） */}
          <Card>
            <CardHeader
              title={`担当者 ${contacts.length} 名`}
              actions={
                <ButtonLink
                  href={`/companies/${company.id}/contacts/new`}
                  variant="primary"
                  size="sm"
                >
                  担当者を追加
                </ButtonLink>
              }
            />
            {contacts.length > 0 ? (
              <CardBody>
                <div className="grid gap-4 sm:grid-cols-2">
                  {contacts.map((c) => (
                    <Card key={c.id}>
                      <CardBody>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="font-medium text-ink">{c.name}</p>
                              {c.decision_role && (
                                <span
                                  className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                                    DECISION_ROLE_STYLE[c.decision_role]
                                  }`}
                                >
                                  {CONTACT_DECISION_ROLE_MARK[c.decision_role]}{" "}
                                  {CONTACT_DECISION_ROLE[c.decision_role]}
                                </span>
                              )}
                            </div>
                            {c.title && (
                              <p className="text-xs text-ink-faint">{c.title}</p>
                            )}
                          </div>
                          <Link
                            href={`/companies/${company.id}/contacts/${c.id}/edit`}
                            className="whitespace-nowrap text-xs text-ink-soft hover:text-brand-700 hover:underline"
                          >
                            編集
                          </Link>
                        </div>

                        {/* 人柄・連絡NG時間帯は商談前の必読情報。
                            連絡NGは「気づいてほしいが作業は続けられる」ため warn（赤は使わない） */}
                        {(c.personality || c.contact_ng_hours) && (
                          <div className="mt-3 space-y-2">
                            {c.personality && (
                              <p className="text-sm font-medium text-ink">
                                人柄: {c.personality}
                              </p>
                            )}
                            {c.contact_ng_hours && (
                              <Banner
                                tone="warn"
                                title={`連絡NG: ${c.contact_ng_hours}`}
                              />
                            )}
                          </div>
                        )}

                        <div className="mt-3">
                          <DescList>
                            <DescItem label="想定リードタイム">
                              {c.lead_time ? CONTACT_LEAD_TIME[c.lead_time] : "—"}
                            </DescItem>
                            <DescItem label="メール">{c.email ?? "—"}</DescItem>
                            <DescItem label="電話">{c.phone ?? "—"}</DescItem>
                          </DescList>
                        </div>

                        {c.note && (
                          <p className="mt-3 text-xs text-ink-soft">{c.note}</p>
                        )}
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </CardBody>
            ) : (
              <EmptyState
                title="まだ担当者が登録されていません"
                description="決裁権や連絡NG時間帯を登録しておくと、商談前に誰へどう当たるかが判断できます。"
                action={
                  <ButtonLink
                    href={`/companies/${company.id}/contacts/new`}
                    variant="primary"
                    size="sm"
                  >
                    最初の担当者を登録
                  </ButtonLink>
                }
              />
            )}
          </Card>

          {/* この会社に紐づく案件一覧 */}
          <Card>
            <CardHeader
              title={`案件 ${deals.length} 件`}
              actions={
                <ButtonLink
                  href={`/deals/new?company_id=${company.id}`}
                  size="sm"
                >
                  案件を追加
                </ButtonLink>
              }
            />
            {deals.length > 0 ? (
              <CardBody>
                <ul className="divide-y divide-line">
                  {deals.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
                    >
                      <Link
                        href={`/deals/${d.id}`}
                        className="font-medium text-ink hover:text-brand-700 hover:underline"
                      >
                        {d.title}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            STAGE_BADGE_STYLE[d.stage]
                          }`}
                        >
                          {DEAL_STAGE[d.stage]}
                        </span>
                        <span className="text-xs text-ink-faint">
                          {DEAL_CHANNEL[d.channel]}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            ) : (
              <EmptyState
                title="まだ案件がありません"
                description="この会社との商談を案件として登録すると、ステージごとの進み具合を追えます。"
                action={
                  <ButtonLink
                    href={`/deals/new?company_id=${company.id}`}
                    variant="primary"
                    size="sm"
                  >
                    最初の案件を登録
                  </ButtonLink>
                }
              />
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
