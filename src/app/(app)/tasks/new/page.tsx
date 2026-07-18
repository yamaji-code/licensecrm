import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTask } from "../actions";
import { TASK_PRIORITY, TASK_STATUS, type Company, type Deal } from "@/lib/types";
import {
  Banner,
  ButtonLink,
  Card,
  CardBody,
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

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ deal_id?: string | string[]; next?: string | string[] }>;
}) {
  const { deal_id, next } = await searchParams;
  const presetDealId = typeof deal_id === "string" ? deal_id : "";
  const nextValue = typeof next === "string" ? next : Array.isArray(next) ? next[0] : "";
  const showNextBanner = nextValue === "1";

  const supabase = await createClient();
  const [{ data: companyData }, { data: dealData }] = await Promise.all([
    supabase.from("companies").select("id, name").order("name", { ascending: true }),
    supabase
      .from("deals")
      .select("*, companies ( name )")
      .order("created_at", { ascending: false }),
  ]);
  const companies = (companyData ?? []) as Pick<Company, "id" | "name">[];
  const deals = (dealData ?? []) as DealOption[];

  return (
    <PageShell width="narrow">
      <PageHeader
        title="タスクを新規登録"
        back={
          <Link href="/tasks" className="text-ink-soft hover:text-brand-700">
            ← タスク一覧
          </Link>
        }
      />

      {showNextBanner && (
        <div className="mb-4">
          <Banner tone="info">
            前のタスクが完了しました。次のアクションを設定してください。
          </Banner>
        </div>
      )}

      <Card>
        <CardBody>
          <form action={createTask} className="space-y-5">
            <Field htmlFor="title" label="タイトル" required>
              <Input id="title" name="title" required />
            </Field>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field htmlFor="status" label="ステータス">
                <Select id="status" name="status" defaultValue="todo">
                  {Object.entries(TASK_STATUS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field htmlFor="priority" label="優先度">
                <Select id="priority" name="priority" defaultValue="medium">
                  {Object.entries(TASK_PRIORITY).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              {/* 案件に紐づくタスクは期限がないと追えなくなるため、案件指定時のみ必須 */}
              <Field htmlFor="due_date" label="期限" required={Boolean(presetDealId)}>
                <Input
                  id="due_date"
                  name="due_date"
                  type="date"
                  required={Boolean(presetDealId)}
                />
              </Field>
            </div>

            <Field
              htmlFor="deal_id"
              label="関連する案件"
              hint="選択すると期限の入力が必須になります"
            >
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
              <Select id="company_id" name="company_id" defaultValue="">
                <option value="">（なし）</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field htmlFor="note" label="メモ">
              <Textarea id="note" name="note" rows={3} />
            </Field>

            <FormActions>
              <SubmitButton pendingLabel="登録中…">登録する</SubmitButton>
              <ButtonLink href="/tasks" variant="ghost">
                キャンセル
              </ButtonLink>
            </FormActions>
          </form>
        </CardBody>
      </Card>
    </PageShell>
  );
}
