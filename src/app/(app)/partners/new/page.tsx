import Link from "next/link";
import { createPartner } from "../actions";
import { PARTNER_RANK } from "@/lib/types";
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
            <Field htmlFor="name" label="名前" required>
              <Input id="name" name="name" required />
            </Field>

            <Field htmlFor="company_name" label="法人名">
              <Input id="company_name" name="company_name" />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="phone" label="電話番号">
                <Input id="phone" name="phone" />
              </Field>
              <Field htmlFor="email" label="メールアドレス">
                <Input id="email" name="email" type="email" />
              </Field>
            </div>

            <Field htmlFor="referred_by" label="誰からの紹介か">
              <Input id="referred_by" name="referred_by" />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="specialty" label="得意領域">
                <Input id="specialty" name="specialty" />
              </Field>
              <Field htmlFor="rank" label="ランク">
                <Select id="rank" name="rank" defaultValue="">
                  <option value="">（未設定）</option>
                  {Object.entries(PARTNER_RANK).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field htmlFor="referral_fee" label="紹介手数料">
              <Input
                id="referral_fee"
                name="referral_fee"
                placeholder="例: 契約額の10%"
              />
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
