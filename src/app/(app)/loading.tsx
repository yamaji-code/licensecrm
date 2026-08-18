import { PageShell, SkeletonPage } from "@/components/ui";

/*
 * 画面遷移中の表示。
 * 従来は全ページが await Promise.all(...) で完全にブロックしていたため、
 * リンクを押してから描画までの間、前のページが固まったままだった。
 */
export default function Loading() {
  return (
    <PageShell>
      <SkeletonPage />
    </PageShell>
  );
}
