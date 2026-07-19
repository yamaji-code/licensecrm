"use client";

// ルートレイアウト自体が落ちた場合の最後の受け皿。
// global-error は root layout ごと置き換わるため html/body を自前で描画し、
// Tailwind が効かない前提でインラインスタイルを使う（xkitchen-tools と同じ方針）。
// ※ 通常のページ/フォームのエラーは (app)/error.tsx が先に受け止める。
//
// 色は globals.css のトークン実値をそのまま写す（Tailwind が使えないため参照できない）。
// トークンを変えたらこの値も合わせること。
//   surface #f6f7fb / line #e3e6ee / ink #1f2430 / ink-soft #5b6478
//   ink-faint #858da1 / brand-700 #1a2872 / radius-card 10px
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラー監視サービスは未導入のため、まずはコンソールに残す
    console.error(error);
  }, [error]);

  return (
    <html lang="ja">
      <body style={{ margin: 0, background: "#f6f7fb" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily:
              "system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: 460,
              width: "100%",
              background: "#fff",
              border: "1px solid #e3e6ee",
              borderRadius: 10,
              padding: 32,
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#1f2430",
                margin: "0 0 12px",
              }}
            >
              エラーが発生しました
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "#5b6478",
                margin: "0 0 8px",
              }}
            >
              ページの表示中に問題が発生しました。もう一度お試しください。
            </p>
            <p style={{ fontSize: 12, color: "#858da1", margin: "0 0 24px" }}>
              直前に入力した内容は残らない場合があります。
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background: "#1a2872",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              もう一度試す
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
