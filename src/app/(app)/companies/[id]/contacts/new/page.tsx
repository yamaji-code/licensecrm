import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createContact } from "../../../actions";
import { CONTACT_DECISION_ROLE, CONTACT_LEAD_TIME, type Company } from "@/lib/types";
import {
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

export default async function NewContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const company = data as Pick<Company, "id" | "name">;

  return (
    <PageShell width="narrow">
      <PageHeader
        title="担当者を新規登録"
        back={
          <Link
            href={`/companies/${company.id}`}
            className="text-ink-soft hover:text-brand-700 hover:underline"
          >
            ← {company.name}
          </Link>
        }
      />

      <Card>
        <CardBody>
          <form action={createContact} className="space-y-5">
            <input type="hidden" name="company_id" value={company.id} />

            <Field htmlFor="name" label="氏名" required>
              <Input id="name" name="name" required />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="name_kana" label="氏名（かな）">
                <Input id="name_kana" name="name_kana" />
              </Field>
              <Field htmlFor="title" label="役職">
                <Input id="title" name="title" />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="email" label="メール">
                <Input id="email" name="email" type="email" />
              </Field>
              <Field htmlFor="phone" label="電話番号">
                <Input id="phone" name="phone" />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="decision_role" label="決裁権区分">
                <Select id="decision_role" name="decision_role" defaultValue="">
                  <option value="">（未設定）</option>
                  {Object.entries(CONTACT_DECISION_ROLE).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field htmlFor="lead_time" label="想定リードタイム">
                <Select id="lead_time" name="lead_time" defaultValue="">
                  <option value="">（未設定）</option>
                  {Object.entries(CONTACT_LEAD_TIME).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field htmlFor="personality" label="人柄（1行）">
              <Input
                id="personality"
                name="personality"
                placeholder="例: 論理的で即決タイプ、価格に厳しい"
              />
            </Field>

            <Field htmlFor="contact_ng_hours" label="連絡NG時間帯">
              <Input
                id="contact_ng_hours"
                name="contact_ng_hours"
                placeholder="例: 平日午前中は会議で不可"
              />
            </Field>

            <Field htmlFor="note" label="メモ">
              <Textarea id="note" name="note" rows={3} />
            </Field>

            <FormActions>
              <SubmitButton pendingLabel="登録中…">登録する</SubmitButton>
              <ButtonLink href={`/companies/${company.id}`} variant="ghost">
                キャンセル
              </ButtonLink>
            </FormActions>
          </form>
        </CardBody>
      </Card>
    </PageShell>
  );
}
