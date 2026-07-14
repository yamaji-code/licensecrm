# License CRM

社内向けの業務効率化 Web アプリ（CRM ＋ タスク管理）。

- **フレームワーク**: Next.js 16 (App Router, TypeScript)
- **スタイル**: Tailwind CSS v4
- **DB / 認証**: Supabase（社内メンバーのメールログイン）
- **デプロイ**: Vercel

## セットアップ

1. 依存関係をインストール

   ```bash
   npm install
   ```

2. Supabase プロジェクトを用意し、環境変数を設定

   ```bash
   cp .env.example .env.local
   # .env.local に NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を記入
   ```

3. 開発サーバー起動

   ```bash
   npm run dev
   ```

   http://localhost:3000 を開く。環境変数が未設定でもトップページは表示される（認証はスキップ）。

## 認証

- Supabase の magic link（メールのログインリンク）方式。
- 社内メンバーのみ。許可ドメインは `ALLOWED_EMAIL_DOMAINS` で制御予定。
- ルーティングガードは `src/proxy.ts`（Next.js 16 で middleware は proxy に改名）。

## ディレクトリ

```
src/
  app/
    page.tsx            トップ（モジュール一覧ダッシュボード）
    login/page.tsx      ログイン画面
    auth/callback/      magic link コールバック
  lib/supabase/
    client.ts           ブラウザ用クライアント
    server.ts           サーバー用クライアント
    proxy.ts            セッション更新ヘルパー
  proxy.ts              ルーティングガード（旧 middleware）
```

## 開発フェーズ

- [x] フェーズ1: 土台（Next.js + Tailwind + Supabase 連携コード）
- [ ] フェーズ2: Supabase スキーマ（取引先 / 担当者 / タスク）＋ 認証
- [ ] フェーズ3: CRM 画面
- [ ] フェーズ4: タスク管理
- [ ] フェーズ5: Vercel 本番デプロイ
