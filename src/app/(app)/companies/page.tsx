import { COMPANY_STATUS_STYLE } from "@/components/badges";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COMPANY_SIZE, COMPANY_STATUS, type Company } from "@/lib/types";
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

export default async function CompaniesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  const companies = (data ?? []) as Company[];

  return (
    <PageShell>
      <PageHeader
        title="取引先・顧客"
        meta={`${companies.length} 社`}
        actions={
          <ButtonLink href="/companies/new" variant="primary">
            新規登録
          </ButtonLink>
        }
      />

      {error && (
        <div className="mb-4">
          <LoadErrorBanner message={error.message} />
        </div>
      )}

      {companies.length === 0 ? (
        <Card>
          <EmptyState
            title="まだ取引先が登録されていません"
            description="営業先の会社を登録すると、案件・担当者・MTGログを紐づけて管理できます。"
            action={
              <ButtonLink href="/companies/new" variant="primary" size="sm">
                最初の取引先を登録
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <>
          {/* 広い画面は表。和文は列が潰れると縦積みになって読めなくなるため、
              狭い画面ではカードに落とす（表の横スクロールより読みやすい） */}
          <Card className="hidden overflow-hidden sm:block">
            <Table caption="取引先の一覧">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>会社名</TH>
                  <TH>ステータス</TH>
                  <TH>規模</TH>
                  <TH>業種</TH>
                  <TH>電話</TH>
                </TR>
              </THead>
              <TBody>
                {companies.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <Link
                        href={`/companies/${c.id}`}
                        className="font-medium text-ink hover:text-brand-700 hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.name_kana && (
                        <p className="text-xs text-ink-faint">{c.name_kana}</p>
                      )}
                    </TD>
                    <TD>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          COMPANY_STATUS_STYLE[c.status]
                        }`}
                      >
                        {COMPANY_STATUS[c.status]}
                      </span>
                    </TD>
                    <TD className="text-ink-soft">
                      {c.company_size ? COMPANY_SIZE[c.company_size] : "未設定"}
                    </TD>
                    <TD className="text-ink-soft">{c.industry ?? "—"}</TD>
                    <TD className="text-ink-soft">{c.phone ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <ul className="space-y-2 sm:hidden">
            {companies.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/companies/${c.id}`}
                  className="block rounded-card border border-line bg-white px-4 py-3 shadow-card transition-colors hover:border-brand-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-ink">{c.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        COMPANY_STATUS_STYLE[c.status]
                      }`}
                    >
                      {COMPANY_STATUS[c.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {c.company_size ? COMPANY_SIZE[c.company_size] : "規模未設定"}
                    {c.industry ? ` ・ ${c.industry}` : ""}
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
