import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { APPROACH_STS_TONE, type ApproachTarget } from "@/lib/types";
import {
  Banner,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  LoadErrorBanner,
  PageHeader,
  PageShell,
  Segmented,
  StatItem,
  StatStrip,
  SubmitButton,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui";
import { convertToDeal } from "./actions";

const STS_TONE_CLASS: Record<string, string> = {
  ok: "bg-ok-bg text-ok",
  brand: "bg-brand-100 text-brand-800",
  warn: "bg-warn-bg text-warn",
  muted: "bg-surface text-ink-faint",
};

function StsBadge({ sts }: { sts: string | null }) {
  if (!sts) return <span className="text-ink-faint">—</span>;
  const tone = APPROACH_STS_TONE[sts] ?? "muted";
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STS_TONE_CLASS[tone]}`}
    >
      {sts}
    </span>
  );
}

/** URLはそのまま出すと長いので、行内では短い見出しのリンクにする */
function LinkCell({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="text-ink-faint">—</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-brand-700 hover:underline"
    >
      {label}
    </a>
  );
}

export default async function ApproachPage({
  searchParams,
}: {
  searchParams: Promise<{ sts?: string | string[]; imported?: string | string[] }>;
}) {
  const { sts, imported } = await searchParams;
  const stsFilter = typeof sts === "string" ? sts : "all";
  const importedCount = typeof imported === "string" ? imported : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approach_targets")
    .select("*")
    .order("sort_order", { ascending: true });

  const all = (data ?? []) as ApproachTarget[];
  // 絞り込みは未着手（STS空欄）も選べるようにする。件数が一番多いため
  const rows =
    stsFilter === "all"
      ? all
      : stsFilter === "none"
        ? all.filter((r) => !r.sts)
        : all.filter((r) => r.sts === stsFilter);

  // 絞り込みの選択肢はデータにある STS から作る（シート側で増えても追従する）
  const stsCounts = new Map<string, number>();
  for (const r of all) {
    if (!r.sts) continue;
    stsCounts.set(r.sts, (stsCounts.get(r.sts) ?? 0) + 1);
  }
  const noneCount = all.filter((r) => !r.sts).length;
  const dealCount = all.filter((r) => r.deal_id).length;
  const lastImported = all[0]?.imported_at?.slice(0, 10) ?? null;

  return (
    <PageShell>
      <PageHeader
        title="アプローチリスト"
        description="案件になる前のアプローチ先。スプレッドシートが本体で、ここは取り込んだ内容を見る画面です。"
        meta={`${all.length} 件`}
        actions={
          <ButtonLink href="/approach/import" variant="secondary">
            シートから取り込む
          </ButtonLink>
        }
      />

      {importedCount && (
        <div className="mb-4">
          <Banner tone="ok" title={`${importedCount} 件を取り込みました`}>
            シートの内容で入れ替えました。案件化済みの行のリンクは引き継いでいます。
          </Banner>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <LoadErrorBanner message={error.message} />
        </div>
      )}

      {all.length === 0 ? (
        <Card>
          <EmptyState
            title="まだ取り込まれていません"
            description="スプレッドシート「ライセンス_営業リスト」の【New】アプローチ先タブからコピーして取り込みます。"
            action={
              <ButtonLink href="/approach/import" variant="primary" size="sm">
                シートから取り込む
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <StatStrip
              note={
                lastImported
                  ? `最終取り込み: ${lastImported}。シート側で更新したら、もう一度「シートから取り込む」を実行してください。`
                  : undefined
              }
            >
              <StatItem label="アプローチ先" value={all.length} sub="件" />
              <StatItem label="未着手" value={noneCount} sub="件" />
              <StatItem
                label="アポ"
                value={stsCounts.get("アポ") ?? 0}
                sub="件"
                tone={(stsCounts.get("アポ") ?? 0) > 0 ? "ok" : undefined}
              />
              <StatItem label="案件化済み" value={dealCount} sub="件" />
            </StatStrip>
          </div>

          <div className="mb-4">
            <Segmented
              label="STSで絞り込み"
              active={stsFilter}
              options={[
                { value: "all", label: `すべて ${all.length}`, href: "/approach" },
                {
                  value: "none",
                  label: `未着手 ${noneCount}`,
                  href: "/approach?sts=none",
                },
                ...[...stsCounts.entries()].map(([value, count]) => ({
                  value,
                  label: `${value} ${count}`,
                  href: `/approach?sts=${encodeURIComponent(value)}`,
                })),
              ]}
            />
          </div>

          <Card>
            <CardHeader
              title="一覧"
              description="シートの並び順のまま表示しています。行の内容はシート側で更新してください。"
            />
            <Table caption="アプローチ先の一覧">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>時期</TH>
                  <TH>STS</TH>
                  <TH>ブランド名</TH>
                  <TH>運営会社</TH>
                  <TH numeric>店舗数</TH>
                  <TH numeric>平均評価</TH>
                  <TH numeric>評価数</TH>
                  <TH>電話番号</TH>
                  <TH>代表者</TH>
                  <TH>リンク</TH>
                  <TH>案件</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD className="whitespace-nowrap text-xs text-ink-soft">
                      {r.approach_month ?? "—"}
                    </TD>
                    <TD>
                      <StsBadge sts={r.sts} />
                    </TD>
                    <TD>
                      <span className="font-medium text-ink">
                        {r.brand_name ?? "—"}
                      </span>
                      {r.category && (
                        <span className="block text-xs text-ink-faint">
                          {r.category}
                        </span>
                      )}
                      {r.memo && (
                        <span
                          className="mt-0.5 block max-w-md truncate text-xs text-ink-faint"
                          title={r.memo}
                        >
                          {r.memo}
                        </span>
                      )}
                    </TD>
                    <TD className="text-ink-soft">
                      {r.company_name ?? "—"}
                      {r.prefecture && (
                        <span className="block text-xs text-ink-faint">
                          {r.prefecture}
                        </span>
                      )}
                    </TD>
                    <TD numeric className="text-ink-soft">
                      {r.shop_count ?? "—"}
                    </TD>
                    <TD numeric className="text-ink-soft">
                      {r.avg_rating ?? "—"}
                    </TD>
                    <TD numeric className="text-ink-soft">
                      {r.rating_count?.toLocaleString() ?? "—"}
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-ink-soft">
                      {r.phone ?? "—"}
                    </TD>
                    <TD className="whitespace-nowrap text-ink-soft">
                      {r.ceo_name ?? "—"}
                    </TD>
                    <TD className="whitespace-nowrap text-xs">
                      <span className="flex gap-2">
                        <LinkCell href={r.company_url} label="HP" />
                        <LinkCell href={r.uber_url} label="Uber" />
                        <LinkCell href={r.ec_url} label="通販" />
                      </span>
                    </TD>
                    <TD className="whitespace-nowrap">
                      {r.deal_id ? (
                        <Link
                          href={`/deals/${r.deal_id}`}
                          className="text-xs text-brand-700 hover:underline"
                        >
                          案件を開く →
                        </Link>
                      ) : (
                        <form action={convertToDeal}>
                          <input type="hidden" name="id" value={r.id} />
                          <SubmitButton
                            variant="secondary"
                            size="sm"
                            pendingLabel="作成中…"
                          >
                            案件化
                          </SubmitButton>
                        </form>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        </>
      )}
    </PageShell>
  );
}
