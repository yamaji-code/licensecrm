-- 0024: 案件ステージに「撤退」を追加し、「完了」を「拡販」に改称する。
--
-- 撤退 = 一度は進んだが取引を終えることが決まった案件。ボード上は拡販の右に置く。
-- ただし DEAL_STAGE_ORDER（進行順）には入れない。「次へ進む」で自動的に撤退へ
-- 送られては困るため、移動はステージ変更・ドラッグなど手動の操作だけにする。
--
-- 「完了」→「拡販」は表示名だけの変更。キー（sv_ready）は据え置きなので、
-- 既存データ・KPIの計上点（商談=meeting_done / 契約=contract）に影響はない。

begin;

-- 1. deals.stage に withdrawn を許可
alter table public.deals drop constraint if exists deals_stage_check;
alter table public.deals add constraint deals_stage_check
  check (stage in ('approaching', 'meeting_set', 'meeting_done', 'negotiating', 'contract',
                   'branding', 'sv_ready', 'withdrawn', 'nurturing', 'lost',
                   'lost_after_proposal'));

-- 2. stage_events（過去の sourced/picked 履歴は残したまま withdrawn を足す）
alter table public.stage_events drop constraint if exists stage_events_from_stage_check;
alter table public.stage_events add constraint stage_events_from_stage_check
  check (from_stage in ('sourced', 'picked', 'approaching', 'meeting_set', 'meeting_done',
                        'negotiating', 'contract', 'branding', 'sv_ready', 'withdrawn',
                        'nurturing', 'lost', 'lost_after_proposal'));

alter table public.stage_events drop constraint if exists stage_events_to_stage_check;
alter table public.stage_events add constraint stage_events_to_stage_check
  check (to_stage in ('sourced', 'picked', 'approaching', 'meeting_set', 'meeting_done',
                      'negotiating', 'contract', 'branding', 'sv_ready', 'withdrawn',
                      'nurturing', 'lost', 'lost_after_proposal'));

-- 3. 標準タスクの雛形。撤退に雛形は置かないが、許可値はそろえておく
alter table public.stage_task_templates drop constraint if exists stage_task_templates_stage_check;
alter table public.stage_task_templates add constraint stage_task_templates_stage_check
  check (stage in ('approaching', 'meeting_set', 'meeting_done', 'negotiating', 'contract',
                   'branding', 'sv_ready', 'withdrawn', 'nurturing', 'lost',
                   'lost_after_proposal'));

-- 4. genre_stats の open_count から撤退を外す（進行中ではないため）。
--    あわせて、0008 で足した lost_after_proposal が除外リストから漏れていたのを直す。
--    提案後NGの案件が「進行中」に数えられていて、ジャンルの優先度判断がずれていた。
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
      and f.stage not in ('contract', 'branding', 'sv_ready', 'withdrawn',
                          'nurturing', 'lost', 'lost_after_proposal')
  ) as open_count
from public.genres g
  left join public.deals d on d.genre_id = g.id
  left join public.deal_kpi_facts f on f.deal_id = d.id
group by g.id;

commit;
