-- 0006: 企業規模を3区分（tier）に刷新 ＋ 取引先カードの新規項目 ＋ 案件×担当者の紐づけ
--
-- 追加するもの:
--   companies.tier                 企業規模の3区分（enterprise/mid_market/smb。null=未設定）
--                                   旧 company_size（大手/中小）は分類基準が異なるため、
--                                   このカラムは残したまま非推奨とし、新しい tier を追加する。
--                                   既存企業の tier は空から人が振り直す（自動マッピングしない）。
--   companies.legal_name           法人名
--   companies.target_brand         ターゲットブランド
--   companies.lead_source          リード創出（自由記述）
--   companies.parent_company       親会社（自由記述）
--   deal_contacts                  案件×担当者の多対多（1案件に複数の担当者を個別に紐づける）
--   stage_durations / deal_kpi_facts ビュー: 末尾に tier を追加（company_size は互換のため残す）

begin;

alter table public.companies
  add column if not exists tier text
    check (tier in ('enterprise', 'mid_market', 'smb'));

alter table public.companies
  add column if not exists legal_name text,
  add column if not exists target_brand text,
  add column if not exists lead_source text,
  add column if not exists parent_company text;
-- 法人URL は既存の website 列をそのまま使う（新規列なし）

-- =========================================================
-- deal_contacts: 案件×担当者
-- =========================================================
create table if not exists public.deal_contacts (
  deal_id    uuid not null references public.deals (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (deal_id, contact_id)
);

create index if not exists deal_contacts_contact_id_idx on public.deal_contacts (contact_id);

alter table public.deal_contacts enable row level security;

drop policy if exists "authenticated can read deal_contacts" on public.deal_contacts;
create policy "authenticated can read deal_contacts"
  on public.deal_contacts for select to authenticated using (true);
drop policy if exists "authenticated can write deal_contacts" on public.deal_contacts;
create policy "authenticated can write deal_contacts"
  on public.deal_contacts for insert to authenticated with check (true);
drop policy if exists "authenticated can update deal_contacts" on public.deal_contacts;
create policy "authenticated can update deal_contacts"
  on public.deal_contacts for update to authenticated using (true) with check (true);
drop policy if exists "authenticated can delete deal_contacts" on public.deal_contacts;
create policy "authenticated can delete deal_contacts"
  on public.deal_contacts for delete to authenticated using (true);

-- =========================================================
-- KPIビューに tier を追加（末尾への追加なので create or replace 可能。
-- company_size は既存互換のため列として残す）
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
  (row_number() over w = 1) as is_first_event,
  c.tier
from public.stage_events se
  join public.deals d on d.id = se.deal_id
  join public.companies c on c.id = d.company_id
window w as (partition by se.deal_id order by se.changed_at, se.id);

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
  co.company_size,
  co.tier
from public.deals d
  join public.companies co on co.id = d.company_id
  left join public.stage_events m on m.deal_id = d.id and m.to_stage = 'meeting_done'
  left join public.stage_events c2 on c2.deal_id = d.id and c2.to_stage = 'contract'
group by d.id, co.company_size, co.tier;

commit;
