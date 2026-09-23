import Link from "next/link";
import { MEETING_FORMAT_STYLE, MEETING_KIND_STYLE } from "@/components/badges";
import { createClient } from "@/lib/supabase/server";
import {
  MEETING_FORMAT,
  MEETING_KIND,
  meetingLabel,
  type Company,
  type Deal,
  type Meeting,
  type MeetingKind,
} from "@/lib/types";
import {
  ButtonLink,
  Card,
  EmptyState,
  LoadErrorBanner,
  PageHeader,
  PageShell,
  Segmented,
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
  // 区分はMTGのときだけ。call📞 / memo は null なので何も出さない
  if (!format) return null;
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

function KindBadge({ kind }: { kind: MeetingKind | null | undefined }) {
  const k = kind ?? "mtg";
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
        MEETING_KIND_STYLE[k]
      }`}
    >
      {MEETING_KIND[k]}
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

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  const { kind } = await searchParams;
  // 種類での絞り込み（?kind=mtg|call|memo）。未指定はすべて
  const kindFilter: MeetingKind | "all" =
    typeof kind === "string" && kind in MEETING_KIND ? (kind as MeetingKind) : "all";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*, deals ( title ), companies ( name )")
    .order("held_on", { ascending: false });

  const allMeetings = (data ?? []) as MeetingRow[];
  const countOf = (k: MeetingKind) =>
    allMeetings.filter((m) => (m.kind ?? "mtg") === k).length;
  const meetings =
    kindFilter === "all"
      ? allMeetings
      : allMeetings.filter((m) => (m.kind ?? "mtg") === kindFilter);

  return (
    <PageShell>
      <PageHeader
        title="MTG"
        meta={`${MEETING_KIND.mtg} ${countOf("mtg")} / ${MEETING_KIND.call} ${countOf("call")} / ${MEETING_KIND.memo} ${countOf("memo")}`}
        actions={
          <>
            <ButtonLink href="/meetings/snippets" variant="secondary">
              よく使う文章
            </ButtonLink>
            <ButtonLink href="/meetings/new" variant="primary">
              MTGを記録
            </ButtonLink>
          </>
        }
      />

      <div className="mb-4">
        <Segmented
          label="種類"
          active={kindFilter}
          options={[
            { value: "all", label: `すべて ${allMeetings.length}`, href: "/meetings" },
            {
              value: "mtg",
              label: `${MEETING_KIND.mtg} ${countOf("mtg")}`,
              href: "/meetings?kind=mtg",
            },
            {
              value: "call",
              label: `${MEETING_KIND.call} ${countOf("call")}`,
              href: "/meetings?kind=call",
            },
            {
              value: "memo",
              label: `${MEETING_KIND.memo} ${countOf("memo")}`,
              href: "/meetings?kind=memo",
            },
          ]}
        />
      </div>

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
                  <TH>種類</TH>
                  <TH>区分</TH>
                  <TH>関連</TH>
                  <TH>要旨</TH>
                  <TH>&nbsp;</TH>
                </TR>
              </THead>
              <TBody>
                {meetings.map((m) => (
                  <TR key={m.id}>
                    <TD className="whitespace-nowrap text-ink-soft">{m.held_on}</TD>
                    <TD>
                      <p className="font-medium text-ink">{meetingLabel(m)}</p>
                      {m.attendees && (
                        <p className="text-xs text-ink-faint">{m.attendees}</p>
                      )}
                    </TD>
                    <TD>
                      <KindBadge kind={m.kind} />
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
                    <TD className="whitespace-nowrap">
                      <Link
                        href={`/meetings/${m.id}/edit`}
                        className="text-brand-700 hover:underline"
                      >
                        編集
                      </Link>
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
                  <p className="min-w-0 font-medium text-ink">{meetingLabel(m)}</p>
                  <span className="flex shrink-0 items-center gap-1">
                    <KindBadge kind={m.kind} />
                    <FormatBadge format={m.format} />
                  </span>
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
                <p className="mt-1 text-right text-xs">
                  <Link
                    href={`/meetings/${m.id}/edit`}
                    className="text-brand-700 hover:underline"
                  >
                    編集
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageShell>
  );
}
