import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createDeal } from "../actions";
import { DEAL_CHANNEL, PB_STATUS, type Company, type Partner } from "@/lib/types";
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

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string | string[] }>;
}) {
  const { company_id } = await searchParams;
  const presetCompanyId = typeof company_id === "string" ? company_id : "";

  const supabase = await createClient();
  const [{ data: companyData }, { data: partnerData }, { data: genreStatData }] =
    await Promise.all([
      supabase.from("companies").select("id, name").order("name", { ascending: true }),
      supabase.from("partners").select("id, name").order("name", { ascending: true }),
      supabase
        .from("genre_stats")
        .select("genre_id, name, is_active, sort_order, contracted_count")
        .order("sort_order", { ascending: true }),
    ]);
  const companies = (companyData ?? []) as Pick<Company, "id" | "name">[];
  const partners = (partnerData ?? []) as Pick<Partner, "id" | "name">[];
  const genreOptions = ((genreStatData ?? []) as {
    genre_id: string;
    name: string;
    is_active: boolean;
    contracted_count: number;
  }[]).filter((g) => g.is_active);

  return (
    <PageShell width="narrow">
      <PageHeader
        title="案件を新規登録"
        back={
          <Link
            href="/deals"
            className="text-ink-soft hover:text-brand-700 hover:underline"
          >
            ← 案件一覧
          </Link>
        }
      />

      <Card>
        <CardBody>
          <form action={createDeal} className="space-y-5">
            <Field htmlFor="company_id" label="取引先" required>
              <Select
                id="company_id"
                name="company_id"
                required
                defaultValue={presetCompanyId}
              >
                <option value="">（選択してください）</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field htmlFor="title" label="案件名" required>
              <Input id="title" name="title" required />
            </Field>

            <Field
              htmlFor="channel"
              label="獲得チャネル"
              required
              hint="初回接点で決める・後から変えない"
            >
              <Select id="channel" name="channel" required defaultValue="">
                <option value="">（選択してください）</option>
                {Object.entries(DEAL_CHANNEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            {/* パートナー未登録のときは選べる操作が無いので、入力欄ではなく案内を出す
                （空の select を置くと「選ばなかった」のか「選べない」のか区別できない） */}
            {partners.length > 0 ? (
              <Field
                htmlFor="partner_id"
                label="紹介元パートナー"
                hint="紹介系チャネルの場合に選択"
              >
                <Select id="partner_id" name="partner_id" defaultValue="">
                  <option value="">（なし）</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Banner tone="info" title="紹介元パートナーはまだ登録されていません">
                紹介元を記録する場合は、先にパートナーを登録してください。案件はこのまま登録できます。
              </Banner>
            )}

            {genreOptions.length > 0 ? (
              <Field
                htmlFor="genre_id"
                label="ジャンル"
                hint="契約済みジャンルは優先度低（他ジャンルを狙う）"
              >
                <Select id="genre_id" name="genre_id" defaultValue="">
                  <option value="">（未設定）</option>
                  {genreOptions.map((g) => (
                    <option key={g.genre_id} value={g.genre_id}>
                      {g.name}
                      {g.contracted_count > 0 ? "（契約済・優先度低）" : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Banner tone="info" title="ジャンルはまだ登録されていません">
                ジャンルマスタを整備すると、この案件にジャンルを設定できるようになります。案件はこのまま登録できます。
              </Banner>
            )}

            <Field htmlFor="pb_status" label="PB品の状態" hint="商談で確認したら更新">
              <Select id="pb_status" name="pb_status" defaultValue="">
                <option value="">（未確認）</option>
                {Object.entries(PB_STATUS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field htmlFor="note" label="メモ">
              <Textarea id="note" name="note" rows={3} />
            </Field>

            <FormActions>
              <SubmitButton pendingLabel="登録中…">登録する</SubmitButton>
              <ButtonLink href="/deals" variant="ghost">
                キャンセル
              </ButtonLink>
            </FormActions>
          </form>
        </CardBody>
      </Card>
    </PageShell>
  );
}
