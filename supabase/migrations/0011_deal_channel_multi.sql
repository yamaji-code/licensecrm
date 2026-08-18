-- 0011: 獲得チャネルを複数選択（配列）に変更 + 会食/イベント/その他を追加
--
-- deals.channel を text から text[] に変換する（既存の単一値は1要素配列にする）。
-- 許可値: approach_list / partner_referral / ishida_referral / yamaji_referral /
--        dinner（会食） / event（イベント） / other（その他）
--
-- deal_kpi_facts ビューが d.channel を直接 SELECT しているため、列の型変更には
-- 一旦ビューを削除する必要がある（Postgres は型変更対象列に依存するビューがあると
-- ALTER COLUMN TYPE を拒否する）。さらに genre_stats が deal_kpi_facts に依存して
-- いるため、依存関係の順（genre_stats → deal_kpi_facts）で削除し、型変更後に
-- 逆順（deal_kpi_facts → genre_stats）で定義を変更せず再作成する。

begin;

drop view public.genre_stats;
drop view public.deal_kpi_facts;

-- 旧制約は channel = ANY(...) の形（channel がまだ text の前提）なので、
-- 型変更の前に外しておく。型変更後まで残すと text[] = text の演算子が無く失敗する。
alter table public.deals drop constraint deals_channel_check;

alter table public.deals
  alter column channel type text[] using array[channel];

alter table public.deals add constraint deals_channel_check
  check (
    channel <@ array[
      'approach_list', 'partner_referral', 'ishida_referral', 'yamaji_referral',
      'dinner', 'event', 'other'
    ]::text[]
    and array_length(channel, 1) > 0
  );

-- deal_kpi_facts（0006 時点の定義のまま再作成）
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

-- genre_stats（0005 時点の定義のまま再作成）
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

commit;
