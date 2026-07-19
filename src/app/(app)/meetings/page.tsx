import Link from "next/link";
import { MEETING_FORMAT_STYLE } from "@/components/badges";
import { createClient } from "@/lib/supabase/server";
import { MEETING_FORMAT, type Company, type Deal, type Meeting } from "@/lib/types";
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

type MeetingRow = Meeting & {
  deals: Pick<Deal, "title"> | null;
  companies: Pick<Company, "name"> | null;
};

function FormatBadge({ format }: { format: MeetingRow["format"] }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
        MEETING_FORMAT_STYLE[format]
      }`}
    >
      {MEETING_FORMAT[format]}
    </span>
  );
}

/** 関連先（案件優先・なければ取引先）。表とモバイルカードで同じ出し方にする */
function RelatedLink({ meeting }: { meeting: MeetingRow }) {
  if (meeting.deal_id) {
    return (
      <Link
        href={`/deals/${meeting.deal_id}`}
        className="hover:text-brand-700 hover:underline"
      >
        {meeting.deals?.title ?? "案件"}
      </Link>
    );
  }
  if (meeting.company_id) {
    return (
      <Link
        href={`/companies/${meeting.company_id}`}
        className="hover:text-brand-700 hover:underline"
      >
        {meeting.companies?.name ?? "取引先"}
      </Link>
    );
  }
  return <>—</>;
}

export default async function MeetingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*, deals ( title ), companies ( name )")
    .order("held_on", { ascending: false });

  const meetings = (data ?? []) as MeetingRow[];

  return (
    <PageShell>
      <PageHeader
        title="MTG"
        meta={`${meetings.length} 件`}
        actions={
          <ButtonLink href="/meetings/new" variant="primary">
            MTGを記録
          </ButtonLink>
        }
      />

      {error && (
        <div className="mb-4">
          <LoadErrorBanner message={error.message} />
        </div>
      )}

      {meetings.length === 0 ? (
        <Card>
          <EmptyState
            title="まだMTGが記録されていません"
            description="商談や打ち合わせを記録すると、案件・取引先に紐づけて経緯を追えるようになります。"
            action={
              <ButtonLink href="/meetings/new" variant="primary" size="sm">
                最初のMTGを記録
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <>
          {/* 広い画面は表。和文は列が潰れると縦積みになって読めなくなるため、
              狭い画面ではカードに落とす（表の横スクロールより読みやすい） */}
          <Card className="hidden sm:block">
            <Table caption="MTGの一覧">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>実施日</TH>
                  <TH>タイトル</TH>
                  <TH>区分</TH>
                  <TH>関連</TH>
                  <TH>要旨</TH>
                </TR>
              </THead>
              <TBody>
                {meetings.map((m) => (
                  <TR key={m.id}>
                    <TD className="whitespace-nowrap text-ink-soft">{m.held_on}</TD>
                    <TD>
                      <p className="font-medium text-ink">{m.title}</p>
                      {m.attendees && (
                        <p className="text-xs text-ink-faint">{m.attendees}</p>
                      )}
                    </TD>
                    <TD>
                      <FormatBadge format={m.format} />
                    </TD>
                    <TD className="text-ink-soft">
                      <RelatedLink meeting={m} />
                    </TD>
                    <TD className="max-w-xs truncate text-ink-soft">
                      {m.summary ?? "—"}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <ul className="space-y-2 sm:hidden">
            {meetings.map((m) => (
              <li
                key={m.id}
                className="rounded-card border border-line bg-white px-4 py-3 shadow-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-medium text-ink">{m.title}</p>
                  <FormatBadge format={m.format} />
                </div>
                {m.attendees && (
                  <p className="mt-0.5 text-xs text-ink-faint">{m.attendees}</p>
                )}
                <p className="mt-1 text-xs text-ink-soft">
                  {m.held_on} ・ <RelatedLink meeting={m} />
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  {m.summary ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageShell>
  );
}
