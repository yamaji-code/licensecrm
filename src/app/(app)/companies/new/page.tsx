import Link from "next/link";
import { createCompany } from "../actions";
import { COMPANY_SIZE, COMPANY_STATUS } from "@/lib/types";
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

export default function NewCompanyPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="取引先を新規登録"
        back={
          <Link
            href="/companies"
            className="text-ink-soft hover:text-brand-700 hover:underline"
          >
            ← 取引先一覧
          </Link>
        }
      />

      <Card>
        <CardBody>
          <form action={createCompany} className="space-y-5">
            <Field htmlFor="name" label="会社名" required>
              <Input id="name" name="name" required />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="name_kana" label="会社名（かな）">
                <Input id="name_kana" name="name_kana" />
              </Field>
              <Field htmlFor="status" label="ステータス">
                <Select id="status" name="status" defaultValue="prospect">
                  {Object.entries(COMPANY_STATUS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                htmlFor="company_size"
                label="企業規模"
                hint="国内店舗数 30店舗以上は大手（2026-07-20 山路さん確定）"
              >
                <Select id="company_size" name="company_size" defaultValue="">
                  <option value="">（未設定）</option>
                  {Object.entries(COMPANY_SIZE).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field htmlFor="industry" label="業種">
                <Input id="industry" name="industry" />
              </Field>
              <Field htmlFor="phone" label="電話番号">
                <Input id="phone" name="phone" />
              </Field>
            </div>

            <Field htmlFor="website" label="Web サイト">
              <Input id="website" name="website" placeholder="https://" />
            </Field>

            <Field htmlFor="address" label="住所">
              <Input id="address" name="address" />
            </Field>

            <Field htmlFor="note" label="メモ">
              <Textarea id="note" name="note" rows={3} />
            </Field>

            <FormActions>
              <SubmitButton pendingLabel="登録中…">登録する</SubmitButton>
              <ButtonLink href="/companies" variant="ghost">
                キャンセル
              </ButtonLink>
            </FormActions>
          </form>
        </CardBody>
      </Card>
    </PageShell>
  );
}
