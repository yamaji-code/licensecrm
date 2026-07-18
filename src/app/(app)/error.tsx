"use client";

// フォーム送信（Server Action）やデータ取得が失敗したときのエラー境界。
// これが無いと throw が既定のエラーUIになり、本番ではメッセージが汎用文言に置換され、
// 入力内容ごと画面が飛ぶ（非エンジニアには何が起きたか分からない）。
// 再試行導線と、入力が残らない場合がある旨を明示する。
import Link from "next/link";
import { useEffect } from "react";

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
    <div className="px-8 py-16">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-800">
          処理に失敗しました
        </h1>
        <p className="mt-2 text-sm text-red-700">
          もう一度お試しください。エラーが続く場合は、少し時間をおくか管理者にご連絡ください。
        </p>
        <p className="mt-1 text-xs text-red-600">
          （直前に入力した内容は残らない場合があります。お手数ですが再入力をお願いします）
        </p>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            もう一度試す
          </button>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            ダッシュボードへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
