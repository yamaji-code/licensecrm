-- 0023: アプローチリスト（案件になる前のテレアポ台帳）。
--
-- スプレッドシート「ライセンス_営業リスト」の【New】アプローチ先タブが本体で、
-- CRM側はそれを読むだけ。取り込みはシートの内容で総入れ替えする。
-- そのためシート由来の列はCRMで編集しない（編集しても次の取り込みで消えるため）。
--
-- CRM固有の情報は deal_id だけ。「案件化」した行がどの案件になったかを残す。
-- 総入れ替えのときも、ブランド名＋運営会社が一致する行へ deal_id を引き継ぐ。

begin;

create table public.approach_targets (
  id              uuid primary key default gen_random_uuid(),
  -- シートの並び順。一覧をシートと同じ並びで出すために持つ
  sort_order      integer not null default 0,

  -- ここから下はシート由来（CRMでは編集しない）
  approach_month  text,
  sts             text,
  fm              boolean not null default false,
  memo            text,
  brand_name      text,
  shop_count      integer,
  avg_rating      numeric,
  rating_count    integer,
  uber_url        text,
  ec_url          text,
  category        text,
  company_name    text,
  prefecture      text,
  company_url     text,
  phone           text,
  ceo_name        text,
  facebook_note   text,

  -- ここはCRM固有。案件化したらその案件を指す
  deal_id         uuid references public.deals (id) on delete set null,

  imported_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index approach_targets_sort_idx on public.approach_targets (sort_order);
create index approach_targets_sts_idx on public.approach_targets (sts);

alter table public.approach_targets enable row level security;

create policy approach_targets_read
  on public.approach_targets for select to authenticated using (true);
create policy approach_targets_insert
  on public.approach_targets for insert to authenticated with check (true);
create policy approach_targets_update
  on public.approach_targets for update to authenticated using (true) with check (true);
create policy approach_targets_delete
  on public.approach_targets for delete to authenticated using (true);

commit;
