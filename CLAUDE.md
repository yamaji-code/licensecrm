@AGENTS.md

# License CRM — 社内業務効率化アプリ 開発規約

社内向けの CRM ＋ タスク管理 Web アプリ。**Next.js 16 (App Router, TS) + Supabase + Vercel**。
GitHub `yamaji-code/licensecrm` の `main` に push すると **Vercel が自動で本番デプロイ**する。

本番: https://licensecrm.vercel.app

## ローカル起動
- `npm install` → `npm run dev`（Next.js, ポート **3000**）
- 環境変数は `.env.local`（`.env.example` をコピーして値を記入）
  - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`（publishable キー）
  - `ALLOWED_EMAIL_DOMAINS`（例: `x-kitchen.jp`）/ `ALLOWED_EMAILS`（個別許可アドレス）
- ログインは Supabase の magic link（メール）。許可リスト外は締め出す（`src/lib/auth.ts`）

## 技術的な約束
- **Next.js 16 の破壊的変更に注意**（`AGENTS.md` 参照）。特に **middleware は `proxy` に改名**（`src/proxy.ts`）。
  `cookies` / `headers` / `params` / `searchParams` は**すべて async**。
- **絵文字は使わない。** アイコンは SVG かアイコンコンポーネントで表現する。
- スタイルは **Tailwind CSS v4**。既存画面のトーン（slate 系＋角丸カード）に合わせる。
- **秘密情報をコードに書かない。** `service_role` キーやパスワードは扱わない（publishable キーのみ）。
- 外部入力は境界で検証。破壊的変更を避け、新しいコピーを返す（不変性）。

## DB スキーマ変更（Supabase）
- スキーマ変更は **`supabase/migrations/` に SQL を追加**（連番: `0002_xxx.sql` …）。
- 反映は **Supabase の SQL Editor で手動実行**（自動適用ではない）。適用したらPRに明記する。
- テーブルは **RLS 必須**。新規テーブルは「ログイン済みのみ許可」ポリシーを必ず付ける。

## 開発運用ルール（チーム開発 / GitHub Flow）

このリポジトリは **複数名（yamaji・ishida ほか）** で開発する。以下を厳守すること。

1. **`main` に直接コミット・pushしない。** 必ずブランチを切る。
   （**`main` = 本番。push した瞬間に Vercel が本番デプロイする**ため特に厳禁）
2. **ブランチ名は `名前/機能名`**（例: `yamaji/task-edit` / `ishida/company-detail`）— 誰の作業か分かるように。
3. 作業前に `git switch main && git pull` で最新化してからブランチ作成。
4. こまめに小さくコミット → PR作成（Squash推奨）。**main へのマージは各担当が実施。Claude に依頼すれば Claude がマージまで行ってよい**。**マージ＝本番デプロイ**なので、必ず動作確認してから。
5. **各自 Git author を設定**（`git config user.name` / `user.email`）。著者で担当を判別する。
6. ブランチは小さく短命に。作業が長引く時は `git merge main` で定期的に追従。
7. **環境変数（Vercel）の変更はオーナー(yamaji)が実施**。新しい env が必要になったら PR/連絡で共有する。
8. Vercel は GitHub 連携済みで、**PR ごとにプレビューURL**が自動発行される。マージ前にプレビューで確認する。

## 構成
- `src/app/(app)/` … 認証済みエリア（`layout.tsx` でガード＋サイドバー）
  - `page.tsx`（ダッシュボード）/ `companies/`（取引先）/ `tasks/`（タスク）
  - 各機能の `actions.ts` に Server Action（登録・更新）
- `src/app/login/` … ログイン画面 / `src/app/auth/` … callback・signout
- `src/lib/supabase/` … `client.ts`（ブラウザ）/ `server.ts`（サーバー）/ `proxy.ts`（セッション更新・許可判定）
- `src/lib/auth.ts` … ログイン許可リスト判定 / `src/lib/types.ts` … DB 型定義
- `src/proxy.ts` … ルーティングガード（旧 middleware）
- `supabase/migrations/` … DB スキーマの SQL
