import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createMeeting } from "../actions";
import { MtgLogEditor } from "../mtg-log-editor";
import { quickAddNextAction } from "../../tasks/actions";
import { jstDateString } from "@/lib/date";
import {
  MEETING_FORMAT,
  SCENE_TAG,
  TASK_PRIORITY,
  TASK_STATUS,
  type Company,
  type Deal,
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

// 実施日の初期値（JST基準の今日）。DB側はdefault current_dateを持たないため明示送信する。
function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const PROBLEM_ROWS = [1, 2, 3] as const;

export default async function NewMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{
    deal_id?: string | string[];
    company_id?: string | string[];
  }>;
}) {
  const { deal_id, company_id } = await searchParams;
  const presetDealId = typeof deal_id === "string" ? deal_id : "";
  const presetCompanyId = typeof company_id === "string" ? company_id : "";

  const supabase = await createClient();
  const [{ data: companyData }, { data: dealData }, { data: snippetData }] =
    await Promise.all([
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
  const companies = (companyData ?? []) as Pick<Company, "id" | "name">[];
  const deals = (dealData ?? []) as DealOption[];
  const snippets = (snippetData ?? []) as MeetingSnippet[];

  return (
    <PageShell width="narrow">
      <PageHeader
        title="MTGを記録"
        back={
          <Link href="/meetings" className="text-ink-soft hover:text-brand-700">
            ← MTG一覧
          </Link>
        }
      />

      <Card>
        <CardBody>
          <form action={createMeeting} className="space-y-5">
            <Field htmlFor="title" label="MTGタイトル" required>
              <Input id="title" name="title" required />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="format" label="区分" required>
                <Select id="format" name="format" required defaultValue="">
                  <option value="">（選択してください）</option>
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
                  defaultValue={todayJst()}
                />
              </Field>
            </div>

            <Field htmlFor="deal_id" label="関連する案件">
              <Select id="deal_id" name="deal_id" defaultValue={presetDealId}>
                <option value="">（なし）</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.companies?.name ? `${d.companies.name} / ${d.title}` : d.title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field htmlFor="company_id" label="関連する取引先">
              <Select id="company_id" name="company_id" defaultValue={presetCompanyId}>
                <option value="">（なし）</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field htmlFor="attendees" label="参加者">
              <Input id="attendees" name="attendees" />
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
                dealId={presetDealId || null}
                snippets={snippets}
              />
            </Field>

            {/* 困りごとは3行1組の入力グループ。単独のラベルではなくグループ見出しなので
                fieldset + legend で束ねる（読み上げ時にどの入力の話かが分かるようにする） */}
            <div className="border-t border-line pt-5">
              <fieldset>
                <legend className="text-sm font-medium text-ink">困りごと</legend>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                  任意・最大3件。入力すると山路確認キューへ自動登録されます。
                </p>
                <div className="mt-4 space-y-4">
                  {PROBLEM_ROWS.map((i) => (
                    <div key={i} className="grid gap-3 sm:grid-cols-[160px_1fr]">
                      <Field htmlFor={`scene_tag_${i}`} label="場面タグ">
                        <Select
                          id={`scene_tag_${i}`}
                          name={`scene_tag_${i}`}
                          defaultValue=""
                        >
                          <option value="">（未選択）</option>
                          {Object.entries(SCENE_TAG).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field htmlFor={`problem_${i}`} label="内容">
                        <Input id={`problem_${i}`} name={`problem_${i}`} />
                      </Field>
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>

            <FormActions>
              <SubmitButton pendingLabel="登録中…">登録する</SubmitButton>
              <ButtonLink href="/meetings" variant="ghost">
                キャンセル
              </ButtonLink>
            </FormActions>
          </form>
        </CardBody>
      </Card>

      {/* MTGログの画面から、このMTGに関するタスク（または案件に紐づけない自分用のタスク）を
          その場で追加できるようにする。task自体はmeetingとは独立（deal_idのみで管理）なので、
          MTG本体の保存有無に関わらず単独で登録できる。 */}
      <div className="mt-6">
        <Card>
          <CardHeader title="タスクを追加" />
          <CardBody>
            <form action={quickAddNextAction} className="space-y-2">
              <Field htmlFor="task_deal_id" label="関連付け">
                <Select id="task_deal_id" name="deal_id" defaultValue={presetDealId}>
                  <option value="">（なし＝自分のタスク）</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.companies?.name ? `${d.companies.name} / ${d.title}` : d.title}
                    </option>
                  ))}
                </Select>
              </Field>
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
