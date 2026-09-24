-- 0022: 案件の「取引先」を任意項目にする。
--
-- 会社が決まる前の段階（ブランド名しか分かっていない等）でも案件を先に作れるようにする。
--
-- 注意: deal_kpi_facts は companies を内部結合していたため、このまま company_id を
-- null 許可にすると「取引先なしの案件」がKPI集計から丸ごと消えてしまう。
-- 商談数・契約数・成約率がずれるので、左外部結合に張り替える（定義はそれ以外変更なし）。

begin;

alter table public.deals
  alter column company_id drop not null;

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
  left join public.companies co on co.id = d.company_id
  left join public.stage_events m on m.deal_id = d.id and m.to_stage = 'meeting_done'
  left join public.stage_events c2 on c2.deal_id = d.id and c2.to_stage = 'contract'
group by d.id, co.company_size, co.tier;

commit;
