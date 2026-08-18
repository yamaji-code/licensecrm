-- 0013: 案件の「担当者」を取引先の登録済み担当者からの選択制から、
-- 案件専用の自由入力（名前・役職・電話・メール、複数人分）に変更する。
--
-- 旧 deal_contacts（取引先の contacts への中間テーブル）は0件のため、
-- データ移行不要でそのまま廃止する。

begin;

drop table if exists public.deal_contacts;

create table public.deal_contact_entries (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references public.deals (id) on delete cascade,
  name        text not null,
  title       text,
  phone       text,
  email       text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index deal_contact_entries_deal_id_idx on public.deal_contact_entries (deal_id);

alter table public.deal_contact_entries enable row level security;

create policy "authenticated can read deal_contact_entries"
  on public.deal_contact_entries for select to authenticated using (true);
create policy "authenticated can write deal_contact_entries"
  on public.deal_contact_entries for insert to authenticated with check (true);
create policy "authenticated can update deal_contact_entries"
  on public.deal_contact_entries for update to authenticated using (true) with check (true);
create policy "authenticated can delete deal_contact_entries"
  on public.deal_contact_entries for delete to authenticated using (true);

commit;
