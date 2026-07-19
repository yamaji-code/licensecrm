import Link from "next/link";
import { createPartner } from "../actions";
import { PARTNER_TYPE } from "@/lib/types";
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

export default function NewPartnerPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="パートナーを新規登録"
        back={
          <Link
            href="/partners"
            className="text-ink-soft transition-colors hover:text-brand-700"
          >
            ← パートナー一覧
          </Link>
        }
      />

      <Card>
        <CardBody>
          <form action={createPartner} className="space-y-5">
            <Field htmlFor="name" label="パートナー名" required>
              <Input id="name" name="name" required />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="name_kana" label="パートナー名（かな）">
                <Input id="name_kana" name="name_kana" />
              </Field>
              <Field htmlFor="partner_type" label="種別">
                <Select
                  id="partner_type"
                  name="partner_type"
                  defaultValue="company"
                >
                  {Object.entries(PARTNER_TYPE).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="contact_name" label="窓口担当者名">
                <Input id="contact_name" name="contact_name" />
              </Field>
              <Field htmlFor="phone" label="電話番号">
                <Input id="phone" name="phone" />
              </Field>
            </div>

            <Field htmlFor="email" label="メール">
              <Input id="email" name="email" type="email" />
            </Field>

            <Field htmlFor="note" label="メモ">
              <Textarea id="note" name="note" rows={3} />
            </Field>

            <FormActions>
              <SubmitButton pendingLabel="登録中…">登録する</SubmitButton>
              <ButtonLink href="/partners" variant="ghost">
                キャンセル
              </ButtonLink>
            </FormActions>
          </form>
        </CardBody>
      </Card>
    </PageShell>
  );
}
