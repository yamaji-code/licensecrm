import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateContact } from "../../../../actions";
import {
  CONTACT_DECISION_ROLE,
  CONTACT_LEAD_TIME,
  type Company,
  type Contact,
} from "@/lib/types";
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

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string; contactId: string }>;
}) {
  const { id, contactId } = await params;

  const supabase = await createClient();
  const [{ data: companyData, error: companyError }, { data: contactData, error: contactError }] =
    await Promise.all([
      supabase.from("companies").select("id, name").eq("id", id).maybeSingle(),
      supabase.from("contacts").select("*").eq("id", contactId).maybeSingle(),
    ]);

  // 会社が存在しない、担当者が存在しない、または担当者が別会社に紐づく場合は404
  if (
    companyError ||
    !companyData ||
    contactError ||
    !contactData ||
    (contactData as Contact).company_id !== id
  ) {
    notFound();
  }

  const company = companyData as Pick<Company, "id" | "name">;
  const contact = contactData as Contact;

  return (
    <PageShell width="narrow">
      <PageHeader
        title="担当者を編集"
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
          <form action={updateContact} className="space-y-5">
            <input type="hidden" name="id" value={contact.id} />
            <input type="hidden" name="company_id" value={company.id} />

            <Field htmlFor="name" label="氏名" required>
              <Input id="name" name="name" required defaultValue={contact.name} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="name_kana" label="氏名（かな）">
                <Input
                  id="name_kana"
                  name="name_kana"
                  defaultValue={contact.name_kana ?? ""}
                />
              </Field>
              <Field htmlFor="title" label="役職">
                <Input id="title" name="title" defaultValue={contact.title ?? ""} />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="email" label="メール">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={contact.email ?? ""}
                />
              </Field>
              <Field htmlFor="phone" label="電話番号">
                <Input id="phone" name="phone" defaultValue={contact.phone ?? ""} />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="decision_role" label="決裁権区分">
                <Select
                  id="decision_role"
                  name="decision_role"
                  defaultValue={contact.decision_role ?? ""}
                >
                  <option value="">（未設定）</option>
                  {Object.entries(CONTACT_DECISION_ROLE).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field htmlFor="lead_time" label="想定リードタイム">
                <Select
                  id="lead_time"
                  name="lead_time"
                  defaultValue={contact.lead_time ?? ""}
                >
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
                defaultValue={contact.personality ?? ""}
                placeholder="例: 論理的で即決タイプ、価格に厳しい"
              />
            </Field>

            <Field htmlFor="contact_ng_hours" label="連絡NG時間帯">
              <Input
                id="contact_ng_hours"
                name="contact_ng_hours"
                defaultValue={contact.contact_ng_hours ?? ""}
                placeholder="例: 平日午前中は会議で不可"
              />
            </Field>

            <Field htmlFor="note" label="メモ">
              <Textarea
                id="note"
                name="note"
                rows={3}
                defaultValue={contact.note ?? ""}
              />
            </Field>

            <FormActions>
              <SubmitButton pendingLabel="更新中…">更新する</SubmitButton>
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
