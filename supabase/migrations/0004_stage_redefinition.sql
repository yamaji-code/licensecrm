-- 0004: 案件ステージ体系の全面再定義（実業務フローへの適合）
--
-- 実フロー: Uber Eatsスクレイピング→急成長抽出→週1選定→案件化→商談→契約→ブランド化→SV案内可能(ゴール)
--
-- 旧: list / selected / contacting / meeting_set / meeting_done / considering / contract / live            / nurturing / lost
-- 新: sourced / picked / approaching / meeting_set / meeting_done / negotiating / contract / branding / sv_ready / nurturing / lost
--
-- KPI計上点の meeting_done（商談）と contract（契約）はキー名を維持する。
-- deal_kpi_facts ビューの JOIN 条件（to_stage = 'meeting_done' / 'contract'）が無変更となり、
-- 商談20件・契約2件のKPI履歴を1件も失わずに再定義できる。
--
-- 注意: 手順の順序を変えないこと。
-- トリガーを止めずに stage を UPDATE すると log_stage_event が偽のステージ変更履歴を量産する。

begin;

-- 1. 旧値セットの check 制約を外す（外さないとリネーム UPDATE が通らない）
alter table public.deals drop constraint deals_stage_check;
alter table public.stage_events drop constraint stage_events_from_stage_check;
alter table public.stage_events drop constraint stage_events_to_stage_check;

-- 2. リネーム UPDATE 中のトリガーを一時停止
--    log_stage_event: 偽の stage_events 記録を防ぐ
--    set_updated_at: リネームは業務上の更新ではないため updated_at を動かさない
alter table public.deals disable trigger deals_log_stage_event;
alter table public.deals disable trigger deals_set_updated_at;

-- 3. リネーム（deals.stage と stage_events.from_stage / to_stage を同一マッピングで）
update public.deals
set stage = case stage
  when 'list'        then 'sourced'
  when 'selected'    then 'picked'
  when 'contacting'  then 'approaching'
  when 'considering' then 'negotiating'
  when 'live'        then 'sv_ready'
  else stage
end
where stage in ('list', 'selected', 'contacting', 'considering', 'live');

update public.stage_events
set
  from_stage = case from_stage
    when 'list'        then 'sourced'
    when 'selected'    then 'picked'
    when 'contacting'  then 'approaching'
    when 'considering' then 'negotiating'
    when 'live'        then 'sv_ready'
    else from_stage
  end,
  to_stage = case to_stage
    when 'list'        then 'sourced'
    when 'selected'    then 'picked'
    when 'contacting'  then 'approaching'
    when 'considering' then 'negotiating'
    when 'live'        then 'sv_ready'
    else to_stage
  end
where from_stage in ('list', 'selected', 'contacting', 'considering', 'live')
   or to_stage   in ('list', 'selected', 'contacting', 'considering', 'live');

-- 4. トリガーを再開
alter table public.deals enable trigger deals_log_stage_event;
alter table public.deals enable trigger deals_set_updated_at;

-- 5. 新11値で check 制約を再作成し、新規案件の既定ステージを sourced にする
alter table public.deals alter column stage set default 'sourced';

alter table public.deals add constraint deals_stage_check
  check (stage in ('sourced', 'picked', 'approaching', 'meeting_set', 'meeting_done',
                   'negotiating', 'contract', 'branding', 'sv_ready', 'nurturing', 'lost'));

alter table public.stage_events add constraint stage_events_from_stage_check
  check (from_stage in ('sourced', 'picked', 'approaching', 'meeting_set', 'meeting_done',
                        'negotiating', 'contract', 'branding', 'sv_ready', 'nurturing', 'lost'));

alter table public.stage_events add constraint stage_events_to_stage_check
  check (to_stage in ('sourced', 'picked', 'approaching', 'meeting_set', 'meeting_done',
                      'negotiating', 'contract', 'branding', 'sv_ready', 'nurturing', 'lost'));

commit;
