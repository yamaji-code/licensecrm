# UI移植仕様（2026-07-18・toyo/ui-overhaul）

全ページを `src/components/ui/` の共通部品へ移植するときの規律。**この文書の指示から外れないこと。**

## 使える部品（すべて `@/components/ui` から import）

| 部品 | 用途 | 主なprops |
|---|---|---|
| `PageShell` | ページの外枠。余白・最大幅を持つ | `width?: "default" \| "wide" \| "narrow"` |
| `PageHeader` | ページ見出し | `title` `meta` `description` `actions` `back` |
| `SectionTitle` | 画面内の区切り見出し（h2相当） | `actions` |
| `Card` `CardHeader` `CardBody` | 白い面 | `CardHeader: title / description / actions` |
| `DescList` `DescItem` | 「ラベル: 値」の属性表示 | `DescItem: label` |
| `Table` `THead` `TBody` `TR` `TH` `TD` | 表 | `Table: caption`（読み上げ用・必須級）／`TH,TD: numeric` |
| `Button` `ButtonLink` | ボタン／ボタン見た目のリンク | `variant: primary\|secondary\|ghost\|danger` `size: sm\|md` |
| `SubmitButton` | フォーム送信（送信中は自動で無効化） | `pendingLabel` |
| `Input` `Select` `Textarea` `Field` `FormActions` | フォーム | `Field: htmlFor(必須) label required hint error` |
| `Banner` | 通知帯 | `tone: danger\|warn\|ok\|info` `title` `actions` |
| `LoadErrorBanner` | 一覧の読み込み失敗（文言は共通） | `message` |
| `EmptyState` | データ0件 | `title` `description` `action` |
| `Chip` | 小さなラベル | `tone: neutral\|brand\|ok\|warn\|danger\|muted` |
| `Segmented` | 表示切替 | `options` `active` `label` |
| `Skeleton` `SkeletonPage` | 読み込み中 | — |

## 絶対に守ること

1. **className でスタイルを新造しない。** 色・角丸・影・padding を直書きしない。
   - `rounded-2xl border border-slate-200 bg-white p-6` → `Card` + `CardBody`
   - `bg-brand-700 px-4 py-2 ...` → `Button variant="primary"`
   - `field` / `labelCls` のローカル定数は**削除**して `Field` + `Input` へ
2. **色トークンは新しいものを使う。** `slate-*` は使わない。
   - `text-slate-900` → `text-ink` ／ `text-slate-500,600` → `text-ink-soft` ／ `text-slate-400` → `text-ink-faint`
   - `border-slate-200,300` → `border-line`
   - `bg-red-50/text-red-700` → `Banner tone="danger"` ／ `bg-green-*` → `tone="ok"` ／ `bg-amber-*` → `tone="warn"`
3. **赤は「期限切れ・取り消せない操作・読み込み失敗」だけ。** それ以外の注意喚起は `warn`。
   （従来は全カードに赤バッジが出て何も目立たない状態だった）
4. **すべてのフォームの送信ボタンを `SubmitButton` にする。** 二重送信防止と「押したのに無反応」の解消。
5. **必須マークは `Field` の `required` に渡す。** `<span className="text-red-500">*</span>` は全廃（色だけで必須を伝えない）。
6. **表は必ず `Table` を使い `caption` を入れる。**
   - 禁止なのは「`overflow-x-auto` の代わりに `overflow-hidden` を置くこと」（狭い画面で列が欠ける）。
   - `Table` は内側に `overflow-x-auto` を持つので、**外側の `Card` に `overflow-hidden` を付けるのは可**（角丸を効かせるため。横スクロールは内側で成立する）。
   - 行数が多い一覧は、狭い画面用に `sm:hidden` のカードリストを併設する（`companies/page.tsx` が参照実装）。
7. **空状態は `EmptyState`。** 「なし」で終わらせず、次にやることへの導線（`action`）を必ず置く。
8. **文言のトーンを揃える**: 「まだ〜がありません」＋次の一手。体言止めの「〜なし」は使わない。
9. **既存の機能・クエリ・Server Action・URLパラメータの挙動を変えない。** 見た目と構造だけを移す。
   - 表示している項目を勝手に減らさない・増やさない（レイアウトの並べ替えは可）
10. **バッジの意味色は既存の対応表を使う**（`@/components/badges` の `STAGE_BADGE_STYLE` 等）。独自の色を作らない。

## レスポンシブの規律

- `PageShell` が左右余白を持つので、ページ側で `px-8 py-10` を書かない。
- 2カラムは `sm:grid-cols-2` を使う。3カラム以上は `lg:` から。
- タップ対象は最低 40px 高（`Button` の `size="md"` が満たす）。

## アクセシビリティ

- `Field` の `htmlFor` と入力の `id` を必ず一致させる。
- アイコンのみのボタンには `aria-label`。
- 状態を伝えるトグルには `aria-pressed`。

## 完了の条件

- `npx tsc --noEmit` が exit 0
- `npx eslint <触ったファイル>` が exit 0
- 担当ページを実機（http://localhost:3000）で開いて、**移植前に表示されていた情報が全部出ていること**を目視確認
- `slate-` の残骸が担当ファイルに無いこと（`grep -n "slate-" <file>` が空）
