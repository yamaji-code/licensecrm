// 存在しないURLを開いたときの画面。
// これが無いと Next.js の既定画面（英語の "404 This page could not be found."）が出て、
// 非エンジニアには「壊れた」のか「URLが違う」のか分からない。
//
// root layout の中なので Tailwind は効くが、AppShell（サイドバー等）の外にあるため
// ナビゲーションは描かれない。素の中央寄せ画面にして、戻り先だけを明示する。
import { ButtonLink, Card, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card>
          <EmptyState
            title="ページが見つかりません"
            description="URLが変わったか、削除された可能性があります。アドレスの打ち間違いでなければ、ダッシュボードから目的の画面を探してください。"
            action={
              <ButtonLink href="/" variant="primary">
                ダッシュボードへ戻る
              </ButtonLink>
            }
          />
        </Card>
      </div>
    </main>
  );
}
