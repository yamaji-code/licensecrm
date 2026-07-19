"use client";

// フォーム送信（Server Action）やデータ取得が失敗したときのエラー境界。
// これが無いと throw が既定のエラーUIになり、本番ではメッセージが汎用文言に置換され、
// 入力内容ごと画面が飛ぶ（非エンジニアには何が起きたか分からない）。
// 再試行導線と、入力が残らない場合がある旨を明示する。
import { useEffect } from "react";
import { Banner, Button, ButtonLink, PageShell } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <Banner
        tone="danger"
        title="処理に失敗しました"
        actions={
          <>
            <Button variant="primary" onClick={reset}>
              もう一度試す
            </Button>
            <ButtonLink href="/" variant="secondary">
              ダッシュボードへ戻る
            </ButtonLink>
          </>
        }
      >
        もう一度お試しください。エラーが続く場合は、少し時間をおくか管理者にご連絡ください。
        <span className="mt-1 block text-xs opacity-80">
          （直前に入力した内容は残らない場合があります。お手数ですが再入力をお願いします）
        </span>
      </Banner>
    </PageShell>
  );
}
