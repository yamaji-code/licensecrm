import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateMeeting } from "../../actions";
import { MtgLogEditor } from "../../mtg-log-editor";
import { quickAddNextAction } from "../../../tasks/actions";
import { TaskTypeField } from "../../../tasks/task-type-field";
import { jstDateString } from "@/lib/date";
import {
  MEETING_FORMAT,
  TASK_PRIORITY,
  TASK_STATUS,
  type Company,
  type Deal,
  type Meeting,
  type MeetingSnippet,
} from "@/lib/types";
import {
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  Field,
  FormActions,
  Input,
  PageHeader,
  PageShell,
  Select,
  SubmitButton,
  Textarea,
} from "@/components/ui";

type DealOption = Pick<Deal, "id" | "title"> & {
  companies: Pick<Company, "name"> | null;
};

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const [
    { data: meetingData, error: meetingError },
    { data: companyData },
    { data: dealData },
    { data: snippetData },
  ] = await Promise.all([
    supabase.from("meetings").select("*").eq("id", id).maybeSingle(),
    supabase.from("companies").select("id, name").order("name", { ascending: true }),
    supabase
      .from("deals")
      .select("*, companies ( name )")
      .order("created_at", { ascending: false }),
    supabase
      .from("meeting_snippets")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  if (meetingError || !meetingData) {
    notFound();
  }

  const meeting = meetingData as Meeting;
  const companies = (companyData ?? []) as Pick<Company, "id" | "name">[];
  const deals = (dealData ?? []) as DealOption[];
  const snippets = (snippetData ?? []) as MeetingSnippet[];

  const backHref = meeting.deal_id ? `/deals/${meeting.deal_id}` : "/meetings";
  const backLabel = meeting.deal_id ? "← 案件詳細" : "← MTG一覧";

  return (
    <PageShell width="narrow">
      <PageHeader
        title="MTGを編集"
        back={
          <Link href={backHref} className="text-ink-soft hover:text-brand-700">
            {backLabel}
          </Link>
        }
      />

      <Card>
        <CardBody>
          <form action={updateMeeting} className="space-y-5">
            <input type="hidden" name="id" value={meeting.id} />

            <Field htmlFor="title" label="MTGタイトル" required>
              <Input id="title" name="title" required defaultValue={meeting.title} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="format" label="区分" required>
                <Select id="format" name="format" required defaultValue={meeting.format}>
                  {Object.entries(MEETING_FORMAT).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field htmlFor="held_on" label="実施日" required>
                <Input
                  id="held_on"
                  name="held_on"
                  type="date"
                  required
                  defaultValue={meeting.held_on.slice(0, 10)}
                />
              </Field>
            </div>

            <Field htmlFor="deal_id" label="関連する案件">
              <Select id="deal_id" name="deal_id" defaultValue={meeting.deal_id ?? ""}>
                <option value="">（なし）</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.companies?.name ? `${d.companies.name} / ${d.title}` : d.title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field htmlFor="company_id" label="関連する取引先">
              <Select id="company_id" name="company_id" defaultValue={meeting.company_id ?? ""}>
                <option value="">（なし）</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field htmlFor="attendees" label="参加者">
              <Input id="attendees" name="attendees" defaultValue={meeting.attendees ?? ""} />
            </Field>

            <Field
              htmlFor="summary"
              label="要旨"
              hint={
                <Link
                  href="/meetings/snippets"
                  className="text-brand-700 hover:underline"
                >
                  よく使う文章を管理
                </Link>
              }
            >
              <MtgLogEditor
                name="summary"
                defaultValue={meeting.summary ?? ""}
                dealId={meeting.deal_id}
                snippets={snippets}
              />
            </Field>

            <FormActions>
              <SubmitButton pendingLabel="更新中…">更新する</SubmitButton>
              <ButtonLink href={backHref} variant="ghost">
                キャンセル
              </ButtonLink>
            </FormActions>
          </form>
        </CardBody>
      </Card>

      {/* MTGログの画面から、このMTGに関するタスク（または案件に紐づけない自分用のタスク）を
          その場で追加できるようにする。task自体はmeetingとは独立（deal_idのみで管理）。 */}
      <div className="mt-6">
        <Card>
          <CardHeader title="タスクを追加" />
          <CardBody>
            <form action={quickAddNextAction} className="space-y-2">
              <TaskTypeField deals={deals} defaultDealId={meeting.deal_id} />
              <div className="flex items-center gap-2">
                <Input
                  name="title"
                  placeholder="タスクを追記…"
                  className="flex-1"
                  required
                />
                <SubmitButton size="sm" pendingLabel="追加中…">
                  追加
                </SubmitButton>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select name="priority" defaultValue="medium" className="w-24">
                  {Object.entries(TASK_PRIORITY).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Select name="status" defaultValue="todo" className="w-28">
                  {Object.entries(TASK_STATUS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Input
                  name="due_date"
                  type="date"
                  defaultValue={jstDateString(7)}
                  className="w-40"
                />
              </div>
              <Textarea name="note" placeholder="メモ" rows={2} />
            </form>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
