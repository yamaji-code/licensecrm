-- 営業パイプライン スキーマ
-- パートナー / 案件 / ステージ履歴 / 紹介 / 商談 / ナレッジカード ＋ 既存テーブル拡張 ＋ KPI ビュー ＋ RLS
-- Supabase の SQL Editor に貼り付けて実行する。

-- =========================================================
-- partners（紹介元パートナー: メーカー・卸・他企業・既存顧客）
-- =========================================================
create table if not exists public.partners (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  name_kana     text,
  partner_type  text not null default 'company'
                  check (partner_type in ('maker', 'wholesaler', 'company', 'customer')),
  company_id    uuid references public.companies (id) on delete set null,
  contact_name  text,
  email         text,
  phone         text,
  note          text,
  owner_id      uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists partners_name_idx on public.partners (name);
create index if not exists partners_partner_type_idx on public.partners (partner_type);

create trigger partners_set_updated_at
  before update on public.partners
  for each row execute function public.set_updated_at();

-- =========================================================
-- deals（案件）
-- channel は初回接点で決めて以後変えない運用（チャネル別 KPI の分母になるため）
-- =========================================================
create table if not exists public.deals (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  title       text not null,
  stage       text not null default 'list'
                check (stage in ('list', 'selected', 'contacting', 'meeting_set', 'meeting_done',
                                 'considering', 'contract', 'live', 'nurturing', 'lost')),
  channel     text not null
                check (channel in ('referral_customer', 'referral_alliance', 'direct_list',
                                   'inbound', 'other')),
  partner_id  uuid references public.partners (id) on delete set null,
  note        text,
  owner_id    uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists deals_company_id_idx on public.deals (company_id);
create index if not exists deals_stage_idx on public.deals (stage);
create index if not exists deals_channel_idx on public.deals (channel);
create index if not exists deals_partner_id_idx on public.deals (partner_id);

create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

-- =========================================================
-- stage_events（ステージ変更履歴 = KPI 自動計上の源泉）
-- 手動 insert はさせず、deals へのトリガーだけが書き込む（RLS 節を参照）
-- =========================================================
create table if not exists public.stage_events (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references public.deals (id) on delete cascade,
  from_stage  text
                check (from_stage in ('list', 'selected', 'contacting', 'meeting_set', 'meeting_done',
                                      'considering', 'contract', 'live', 'nurturing', 'lost')),
  to_stage    text not null
                check (to_stage in ('list', 'selected', 'contacting', 'meeting_set', 'meeting_done',
                                    'considering', 'contract', 'live', 'nurturing', 'lost')),
  changed_by  uuid references auth.users (id) on delete set null,
  changed_at  timestamptz not null default now()
);

create index if not exists stage_events_deal_id_idx on public.stage_events (deal_id);
create index if not exists stage_events_to_stage_changed_at_idx on public.stage_events (to_stage, changed_at);

-- deals の insert / stage 変更を stage_events に自動記録するトリガー関数。
-- security definer = RLS で書き込みを閉じた stage_events にトリガー経由でのみ insert できるようにする。
create or replace function public.log_stage_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.stage_events (deal_id, from_stage, to_stage, changed_by)
    values (new.id, null, new.stage, auth.uid());
  elsif new.stage is distinct from old.stage then
    insert into public.stage_events (deal_id, from_stage, to_stage, changed_by)
    values (new.id, old.stage, new.stage, auth.uid());
  end if;
  return new;
end;
$$;

create trigger deals_log_stage_event
  after insert or update on public.deals
  for each row execute function public.log_stage_event();

-- =========================================================
-- referrals（双方向の紹介記録: 紹介された / 紹介した）
-- =========================================================
create table if not exists public.referrals (
  id           uuid primary key default gen_random_uuid(),
  partner_id   uuid not null references public.partners (id) on delete cascade,
  direction    text not null
                 check (direction in ('received', 'given')),
  deal_id      uuid references public.deals (id) on delete set null,
  company_id   uuid references public.companies (id) on delete set null,
  note         text,
  occurred_on  date not null default current_date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists referrals_partner_id_idx on public.referrals (partner_id);
create index if not exists referrals_deal_id_idx on public.referrals (deal_id);

create trigger referrals_set_updated_at
  before update on public.referrals
  for each row execute function public.set_updated_at();

-- =========================================================
-- meetings（商談・打ち合わせ）
-- =========================================================
create table if not exists public.meetings (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  format      text not null
                check (format in ('online', 'offline')),
  held_on     date not null default current_date,
  deal_id     uuid references public.deals (id) on delete set null,
  company_id  uuid references public.companies (id) on delete set null,
  attendees   text,
  summary     text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists meetings_deal_id_idx on public.meetings (deal_id);
create index if not exists meetings_company_id_idx on public.meetings (company_id);
create index if not exists meetings_held_on_idx on public.meetings (held_on);

create trigger meetings_set_updated_at
  before update on public.meetings
  for each row execute function public.set_updated_at();

-- =========================================================
-- knowledge_cards（現場の困りごと → 回答 → ナレッジ公開）
-- =========================================================
create table if not exists public.knowledge_cards (
  id            uuid primary key default gen_random_uuid(),
  scene_tag     text not null
                  check (scene_tag in ('pb_product', 'maker_intro', 'pricing', 'contract_doc', 'other')),
  problem       text not null,
  solution      text,
  status        text not null default 'open'
                  check (status in ('open', 'review_requested', 'answered', 'published')),
  meeting_id    uuid references public.meetings (id) on delete set null,
  deal_id       uuid references public.deals (id) on delete set null,
  company_id    uuid references public.companies (id) on delete set null,
  requested_by  uuid references auth.users (id) on delete set null,
  answered_by   uuid references auth.users (id) on delete set null,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists knowledge_cards_scene_tag_status_idx on public.knowledge_cards (scene_tag, status);
create index if not exists knowledge_cards_status_idx on public.knowledge_cards (status);
create index if not exists knowledge_cards_deal_id_idx on public.knowledge_cards (deal_id);

create trigger knowledge_cards_set_updated_at
  before update on public.knowledge_cards
  for each row execute function public.set_updated_at();

-- =========================================================
-- 既存テーブルの拡張
-- =========================================================

-- tasks: 案件との紐付け
alter table public.tasks
  add column if not exists deal_id uuid references public.deals (id) on delete set null;

create index if not exists tasks_deal_id_idx on public.tasks (deal_id);

-- contacts: 商談で使うキーマン情報
alter table public.contacts
  add column if not exists decision_role text
    check (decision_role in ('decision_maker', 'influencer', 'gatekeeper'));
alter table public.contacts
  add column if not exists personality text;
alter table public.contacts
  add column if not exists lead_time text
    check (lead_time in ('immediate', 'one_month', 'three_months_plus'));
alter table public.contacts
  add column if not exists contact_ng_hours text;

-- =========================================================
-- deal_kpi_facts（KPI 集計用ビュー）
-- 案件ごとの「商談実施 / 契約」ステージへの初回到達時刻を返す。
-- security_invoker 必須＝呼び出し側の権限で実行し、deals / stage_events の RLS を継承する。
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
  min(c.changed_at) as first_contract_at
from public.deals d
  left join public.stage_events m on m.deal_id = d.id and m.to_stage = 'meeting_done'
  left join public.stage_events c on c.deal_id = d.id and c.to_stage = 'contract'
group by d.id;

-- =========================================================
-- RLS: ログイン済みユーザーのみ全操作を許可（社内専用）
-- =========================================================
alter table public.partners        enable row level security;
alter table public.deals           enable row level security;
alter table public.stage_events    enable row level security;
alter table public.referrals       enable row level security;
alter table public.meetings        enable row level security;
alter table public.knowledge_cards enable row level security;

create policy "authenticated can read partners"          on public.partners        for select to authenticated using (true);
create policy "authenticated can write partners"         on public.partners        for insert to authenticated with check (true);
create policy "authenticated can update partners"        on public.partners        for update to authenticated using (true) with check (true);
create policy "authenticated can delete partners"        on public.partners        for delete to authenticated using (true);

create policy "authenticated can read deals"             on public.deals           for select to authenticated using (true);
create policy "authenticated can write deals"            on public.deals           for insert to authenticated with check (true);
create policy "authenticated can update deals"           on public.deals           for update to authenticated using (true) with check (true);
create policy "authenticated can delete deals"           on public.deals           for delete to authenticated using (true);

-- stage_events は select ポリシーのみ。insert / update / delete ポリシーは意図的に作らない。
-- 書き込みは deals のトリガー（security definer）経由のみ＝KPI の手動計上を禁止するため。
create policy "authenticated can read stage_events"      on public.stage_events    for select to authenticated using (true);

create policy "authenticated can read referrals"         on public.referrals       for select to authenticated using (true);
create policy "authenticated can write referrals"        on public.referrals       for insert to authenticated with check (true);
create policy "authenticated can update referrals"       on public.referrals       for update to authenticated using (true) with check (true);
create policy "authenticated can delete referrals"       on public.referrals       for delete to authenticated using (true);

create policy "authenticated can read meetings"          on public.meetings        for select to authenticated using (true);
create policy "authenticated can write meetings"         on public.meetings        for insert to authenticated with check (true);
create policy "authenticated can update meetings"        on public.meetings        for update to authenticated using (true) with check (true);
create policy "authenticated can delete meetings"        on public.meetings        for delete to authenticated using (true);

create policy "authenticated can read knowledge_cards"   on public.knowledge_cards for select to authenticated using (true);
create policy "authenticated can write knowledge_cards"  on public.knowledge_cards for insert to authenticated with check (true);
create policy "authenticated can update knowledge_cards" on public.knowledge_cards for update to authenticated using (true) with check (true);
create policy "authenticated can delete knowledge_cards" on public.knowledge_cards for delete to authenticated using (true);
