-- 0005: カンバン再設計の新属性・タスク雛形・リードタイム計測（0004 の後に適用すること）
--
-- 追加するもの:
--   companies.company_size      企業規模（大手/中小。決裁リードタイムの規模別計測用）
--   genres                      料理ジャンル/業態マスタ（優先度は genre_stats ビューで自動導出）
--   deals.genre_id / pb_status / migrated_from_legacy
--   stage_task_templates        フェーズ別タスク雛形（ステージ入場時に Server Action が tasks へ展開）
--   tasks.template_id / department（雛形由来の追跡＝二重展開防止・部署フィルタ）
--   stage_durations ビュー      各案件×各ステージの滞在日数（リードタイム源泉）
--   genre_stats ビュー          ジャンル別の契約/進行中件数（1ジャンル1契約の優先度自動導出）
--   deal_kpi_facts 拡張         末尾に genre_id / migrated_from_legacy / company_size を追加

begin;

-- =========================================================
-- companies: 企業規模（null = 未設定。未設定は集計で別枠表示し勝手に寄せない）
-- =========================================================
alter table public.companies
  add column if not exists company_size text
    check (company_size in ('large', 'sme'));

-- =========================================================
-- genres: 料理ジャンル/業態マスタ
-- 優先度は「契約済みジャンルは自動で優先度低」を genre_stats で導出。
-- priority_override は戦略例外用の手動上書き（null = 自動に従う）
-- =========================================================
create table if not exists public.genres (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  name_kana         text,
  priority_override text check (priority_override in ('boost', 'suppress')),
  is_active         boolean not null default true,
  sort_order        integer not null default 0,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists genres_sort_order_idx on public.genres (sort_order);

drop trigger if exists genres_set_updated_at on public.genres;
create trigger genres_set_updated_at
  before update on public.genres
  for each row execute function public.set_updated_at();

-- =========================================================
-- deals: ジャンル / PB品状態 / 旧CRM移行フラグ
-- =========================================================
alter table public.deals
  add column if not exists genre_id uuid references public.genres (id) on delete set null;

alter table public.deals
  add column if not exists pb_status text
    check (pb_status in ('has_pb', 'searching', 'co_creating', 'not_needed'));

alter table public.deals
  add column if not exists migrated_from_legacy boolean not null default false;

create index if not exists deals_genre_id_idx on public.deals (genre_id);

-- 旧CRM移行81件のバックフィル（note タグは全81件に付与済みを確認の上で実行）
update public.deals
set migrated_from_legacy = true
where note like '%【旧CRM移行 2026-07-17】%';

-- =========================================================
-- stage_task_templates: フェーズ別タスク雛形
-- 石田さんレビューで足し引きする前提（変更はデータ編集のみ・デプロイ不要）。
-- is_required = true のタスクだけが「次のステージへ進む」のゲートになる。
-- 展開は Server Action（advanceDealStage / changeDealStage の共通関数）が行う。
-- =========================================================
create table if not exists public.stage_task_templates (
  id              uuid primary key default gen_random_uuid(),
  stage           text not null
    check (stage in ('sourced', 'picked', 'approaching', 'meeting_set', 'meeting_done',
                     'negotiating', 'contract', 'branding', 'sv_ready', 'nurturing', 'lost')),
  title           text not null,
  department      text not null default 'sales'
    check (department in ('sales', 'biz_dev', 'management', 'cs')),
  is_required     boolean not null default true,
  due_offset_days integer not null default 7,
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists stage_task_templates_stage_idx
  on public.stage_task_templates (stage, sort_order);

drop trigger if exists stage_task_templates_set_updated_at on public.stage_task_templates;
create trigger stage_task_templates_set_updated_at
  before update on public.stage_task_templates
  for each row execute function public.set_updated_at();

-- =========================================================
-- tasks: 雛形由来の追跡と部署
-- template_id は on delete restrict = 使用済み雛形は物理削除不可（is_active=false で無効化する運用）
-- unique index (deal_id, template_id) が同一案件×同一雛形の二重展開を DB レベルで防ぐ
-- （手動作成タスクは template_id が null のため衝突しない）
-- =========================================================
alter table public.tasks
  add column if not exists template_id uuid references public.stage_task_templates (id) on delete restrict;

alter table public.tasks
  add column if not exists department text
    check (department in ('sales', 'biz_dev', 'management', 'cs'));

create unique index if not exists tasks_deal_id_template_id_idx
  on public.tasks (deal_id, template_id);

-- =========================================================
-- stage_durations: 各案件×各ステージの滞在日数（リードタイム計測の源泉）
-- is_first_event: 旧CRM移行分は初回イベント時刻が人工のため、
-- リードタイム集計では (migrated_from_legacy and is_first_event) 起点の区間を表示層で除外する。
-- =========================================================
create or replace view public.stage_durations
  with (security_invoker = true)
as
select
  se.deal_id,
  d.company_id,
  c.company_size,
  d.genre_id,
  d.migrated_from_legacy,
  se.to_stage as stage,
  se.changed_at as entered_at,
  lead(se.changed_at) over w as exited_at,
  extract(epoch from (coalesce(lead(se.changed_at) over w, now()) - se.changed_at)) / 86400.0
    as days_in_stage,
  (lead(se.changed_at) over w is null) as is_current,
  (row_number() over w = 1) as is_first_event
from public.stage_events se
  join public.deals d on d.id = se.deal_id
  join public.companies c on c.id = d.company_id
window w as (partition by se.deal_id order by se.changed_at, se.id);

-- =========================================================
-- genre_stats: ジャンル別の契約/進行中件数（優先度の自動導出）
-- 契約判定は first_contract_at と現在ステージの併用
-- （移行データは履歴が現ステージ1件のみのケースがあるため）
-- =========================================================
create or replace view public.genre_stats
  with (security_invoker = true)
as
select
  g.id as genre_id,
  g.name,
  g.priority_override,
  g.is_active,
  g.sort_order,
  count(f.deal_id) filter (
    where f.first_contract_at is not null or f.stage in ('contract', 'branding', 'sv_ready')
  ) as contracted_count,
  count(f.deal_id) filter (
    where f.first_contract_at is null
      and f.stage not in ('contract', 'branding', 'sv_ready', 'nurturing', 'lost')
  ) as open_count
from public.genres g
  left join public.deals d on d.genre_id = g.id
  left join public.deal_kpi_facts f on f.deal_id = d.id
group by g.id;

-- =========================================================
-- deal_kpi_facts 拡張（末尾に列追加のため create or replace 可能）
-- =========================================================
create or replace view public.deal_kpi_facts
  with (security_invoker = true)
as
select
  d.id as deal_id,
  d.company_id,
  d.channel,
  d.partner_id,
  d.stage,
  d.created_at,
  min(m.changed_at) as first_meeting_at,
  min(c2.changed_at) as first_contract_at,
  d.genre_id,
  d.migrated_from_legacy,
  co.company_size
from public.deals d
  join public.companies co on co.id = d.company_id
  left join public.stage_events m on m.deal_id = d.id and m.to_stage = 'meeting_done'
  left join public.stage_events c2 on c2.deal_id = d.id and c2.to_stage = 'contract'
group by d.id, co.company_size;

-- =========================================================
-- RLS（ログイン済みユーザーのみ全操作可・既存規約の4ポリシー形式）
-- =========================================================
alter table public.genres enable row level security;
alter table public.stage_task_templates enable row level security;

drop policy if exists "authenticated can read genres" on public.genres;
create policy "authenticated can read genres"
  on public.genres for select to authenticated using (true);
drop policy if exists "authenticated can write genres" on public.genres;
create policy "authenticated can write genres"
  on public.genres for insert to authenticated with check (true);
drop policy if exists "authenticated can update genres" on public.genres;
create policy "authenticated can update genres"
  on public.genres for update to authenticated using (true) with check (true);
drop policy if exists "authenticated can delete genres" on public.genres;
create policy "authenticated can delete genres"
  on public.genres for delete to authenticated using (true);

drop policy if exists "authenticated can read stage_task_templates" on public.stage_task_templates;
create policy "authenticated can read stage_task_templates"
  on public.stage_task_templates for select to authenticated using (true);
drop policy if exists "authenticated can write stage_task_templates" on public.stage_task_templates;
create policy "authenticated can write stage_task_templates"
  on public.stage_task_templates for insert to authenticated with check (true);
drop policy if exists "authenticated can update stage_task_templates" on public.stage_task_templates;
create policy "authenticated can update stage_task_templates"
  on public.stage_task_templates for update to authenticated using (true) with check (true);
drop policy if exists "authenticated can delete stage_task_templates" on public.stage_task_templates;
create policy "authenticated can delete stage_task_templates"
  on public.stage_task_templates for delete to authenticated using (true);

-- =========================================================
-- seed: タスク雛形の叩き台（石田さんレビューで足し引きする前提。空のときだけ投入＝冪等）
-- 営業前半は営業定石、契約後は旧Notion「16ステップ標準オンボーディング雛形」から起こした。
-- =========================================================
insert into public.stage_task_templates (stage, title, department, is_required, due_offset_days, sort_order)
select v.stage, v.title, v.department, v.is_required, v.due_offset_days, v.sort_order
from (values
  -- picked: 山路さん選定済み＝石田さんの着手準備
  ('picked',       '店舗・アカウント情報の確認（Uber掲載内容・成長要因・エリア）', 'sales', true,  1, 1),
  ('picked',       '運営会社・連絡先の特定（会社名・電話・決裁者候補）',           'sales', true,  2, 2),
  ('picked',       '山路さんの選定理由を案件メモへ転記',                           'sales', true,  2, 3),
  ('picked',       '初回アプローチ文面の準備',                                     'sales', false, 3, 4),
  -- approaching: 案件化・コンタクト
  ('approaching',  '初回コンタクト実施・結果記録',                                 'sales', true,  2, 1),
  ('approaching',  'キーマン特定・担当者登録（決裁役割まで）',                     'sales', true,  5, 2),
  ('approaching',  '商談打診（候補日2〜3提示）',                                   'sales', true,  7, 3),
  ('approaching',  '追いコンタクト（2営業日後・1週間後・2週間後）',                'sales', false, 14, 4),
  -- meeting_set: 商談設定
  ('meeting_set',  '商談日程・形式の確定と招待送付',                               'sales', true,  2, 1),
  ('meeting_set',  '商談資料の準備（ブランド紹介・導入実績・条件概要）',           'sales', true,  5, 2),
  ('meeting_set',  '事前ヒアリング項目の準備（PB品有無・現業態・決裁者）',         'sales', true,  5, 3),
  ('meeting_set',  '前日リマインド送付',                                           'sales', false, 7, 4),
  -- meeting_done: 商談実施（KPI計上）
  ('meeting_done', '商談議事録をMTGログに登録',                                    'sales', true,  1, 1),
  ('meeting_done', 'PB品有無の記録（案件のPB品ステータス更新）',                   'sales', true,  2, 2),
  ('meeting_done', 'お礼メール・資料送付',                                         'sales', true,  2, 3),
  ('meeting_done', '山路さんへの確認・共有（1メッセージに集約）',                  'sales', true,  3, 4),
  -- negotiating: 条件調整
  ('negotiating',  '提案条件の提示（ロイヤリティ・初期費用・導入条件）',           'sales', true,  7, 1),
  ('negotiating',  '懸念点のリスト化と解消（未回答はナレッジへ）',                 'sales', true,  10, 2),
  ('negotiating',  '意思決定期限の合意',                                           'sales', true,  10, 3),
  ('negotiating',  '契約書ドラフト送付',                                           'sales', false, 14, 4),
  -- contract: 契約締結（KPI計上）
  ('contract',     '契約書締結の実務（押印・原本保管）',                           'management', true, 7, 1),
  ('contract',     'ライセンス本部初期情報回収',                                   'sales', true,  7, 2),
  -- branding: ブランド化（16ステップの1〜5＋PB品分岐。全必須完了でSV案内可能へ）
  ('branding',     'PB品有無の確定調査',                                           'biz_dev', true,  7, 1),
  ('branding',     '商品・SKU選定調整（PB品なしは代替品・メーカー探索）',          'biz_dev', true,  14, 2),
  ('branding',     'ゴーストレストラン向けブランド共創（メニュー構成・ブランド名・デリバリー適性）', 'biz_dev', true, 21, 3),
  ('branding',     'マニュアル・原価リスト作成',                                   'biz_dev', true,  21, 4),
  ('branding',     '原価チェック・価格交渉・ロイヤリティ確定',                     'management', true, 28, 5),
  ('branding',     'SV営業キックオフMTG（業態・案内条件説明）',                    'sales', true,  28, 6),
  -- sv_ready: SV案内可能＝ゴール（以降は加盟店展開の運用タスク。全て任意）
  ('sv_ready',     'SV営業案内実施',                                               'sales', false, 7, 1),
  ('sv_ready',     '初期導入店舗数決定',                                           'sales', false, 14, 2),
  ('sv_ready',     '仕入先・倉庫調整',                                             'biz_dev', false, 21, 3),
  ('sv_ready',     '初期倉庫積み上げ数量決定',                                     'biz_dev', false, 21, 4),
  ('sv_ready',     'センター納品',                                                 'biz_dev', false, 28, 5),
  ('sv_ready',     'オープン日・研修日・初回納品日調整',                           'sales', false, 35, 6),
  ('sv_ready',     '初回納品',                                                     'cs',    false, 42, 7),
  ('sv_ready',     '研修',                                                         'sales', false, 42, 8),
  ('sv_ready',     '初期店舗オープン',                                             'sales', false, 49, 9),
  -- nurturing: 時期見送り（放置プール化の防止）
  ('nurturing',    '再アプローチ予定日の設定と見送り理由の記録',                   'sales', true,  3, 1)
) as v(stage, title, department, is_required, due_offset_days, sort_order)
where not exists (select 1 from public.stage_task_templates);

commit;
