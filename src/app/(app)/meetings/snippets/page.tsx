import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createSnippet, deleteSnippet } from "./actions";
import type { MeetingSnippet } from "@/lib/types";
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  FormActions,
  Input,
  PageHeader,
  PageShell,
  SubmitButton,
  Textarea,
} from "@/components/ui";

export default async function MeetingSnippetsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meeting_snippets")
    .select("*")
    .order("created_at", { ascending: false });

  const snippets = (data ?? []) as MeetingSnippet[];

  return (
    <PageShell width="narrow">
      <PageHeader
        title="よく使う文章"
        description="MTG LOGの入力時に呼び出して挿入できます。"
        back={
          <Link href="/meetings" className="text-ink-soft hover:text-brand-700">
            ← MTG一覧
          </Link>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader title="新しい文章を登録" />
          <CardBody>
            <form action={createSnippet} className="space-y-5">
              <Field htmlFor="title" label="タイトル" required>
                <Input id="title" name="title" required placeholder="例: 議事メモの型" />
              </Field>
              <Field htmlFor="body" label="本文" required>
                <Textarea id="body" name="body" rows={4} required />
              </Field>
              <FormActions>
                <SubmitButton pendingLabel="登録中…">登録する</SubmitButton>
              </FormActions>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`登録済み ${snippets.length} 件`} />
          {snippets.length > 0 ? (
            <CardBody>
              <ul className="divide-y divide-line">
                {snippets.map((s) => (
                  <li key={s.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-ink">{s.title}</p>
                      <form action={deleteSnippet}>
                        <input type="hidden" name="id" value={s.id} />
                        <SubmitButton variant="ghost" size="sm" pendingLabel="削除中…">
                          削除
                        </SubmitButton>
                      </form>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-ink-soft">{s.body}</p>
                  </li>
                ))}
              </ul>
            </CardBody>
          ) : (
            <EmptyState
              title="まだ登録されていません"
              description="よく使う文章を登録すると、MTG LOG入力時に呼び出して挿入できます。"
            />
          )}
        </Card>
      </div>
    </PageShell>
  );
}
