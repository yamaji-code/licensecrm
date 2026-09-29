import Link from "next/link";
import {
  ButtonLink,
  Card,
  CardBody,
  Field,
  FormActions,
  PageHeader,
  PageShell,
  SubmitButton,
  Textarea,
} from "@/components/ui";
import { importApproachTargets } from "../actions";

/*
 * シートから取り込む画面。
 * スプレッドシートの範囲をコピーするとタブ区切りでクリップボードに入るので、
 * それをそのまま貼り付けてもらう。Google連携（サービスアカウント）は
 * Vercelの環境変数が必要で、そこはオーナー対応待ちのため今はこの方式にしている。
 */
export default function ApproachImportPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="シートから取り込む"
        back={
          <Link href="/approach" className="text-ink-soft hover:text-brand-700">
            ← アプローチリスト
          </Link>
        }
      />

      <Card>
        <CardBody>
          <div className="mb-5 rounded-card border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink-soft">
            <p className="font-medium text-ink">手順</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5">
              <li>
                スプレッドシート「ライセンス_営業リスト」の
                <span className="font-medium text-ink">【New】アプローチ先</span>
                タブを開く
              </li>
              <li>
                <span className="font-medium text-ink">A2セル</span>から
                右下（Q列の最終行）までを選んでコピー（見出し行は含めても構いません）
              </li>
              <li>下の欄に貼り付けて「取り込む」</li>
            </ol>
            <p className="mt-2 text-xs text-ink-faint">
              取り込みはシートの内容で総入れ替えします。CRM側で案件化した行のリンクは引き継ぎます。
            </p>
          </div>

          <form action={importApproachTargets} className="space-y-4">
            <Field
              htmlFor="tsv"
              label="貼り付け"
              required
              hint="列の順番はシートのまま（アプローチ時期 / STS / FM / メモ / ブランド名 …）にしてください"
            >
              <Textarea
                id="tsv"
                name="tsv"
                required
                rows={14}
                placeholder={"2026/06\t担当者接触\tFALSE\t…\t立川マシマシ\t3\t…"}
                className="font-mono text-xs"
              />
            </Field>

            <FormActions>
              <SubmitButton pendingLabel="取り込み中…">取り込む</SubmitButton>
              <ButtonLink href="/approach" variant="ghost">
                キャンセル
              </ButtonLink>
            </FormActions>
          </form>
        </CardBody>
      </Card>
    </PageShell>
  );
}
