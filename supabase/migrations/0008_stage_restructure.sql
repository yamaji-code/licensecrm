-- 0008: ステージ体系の再編（サヤカさん指定のスプレッドシートに基づく）
--
-- 変更内容:
--   sourced / picked を削除（既存23件は approaching へ統合。ラベルの単なる変更ではないため
--   0004 と同じ手順でトリガーを一時停止し、偽の履歴を残さない）
--   lost を「提案前NG」表示に統一し、新たに lost_after_proposal（提案後NG）を追加
--     （既存の失注17件はいったん全て lost=提案前NG のまま。提案後NGへの移動は手動で行う運用）
--   stage_events.from_stage / to_stage の制約は過去の sourced/picked 履歴を保持する必要があるため
--   sourced/picked を残したまま lost_after_proposal だけ追加する（deals 側とは非対称）
--   stage_task_templates: picked向けの標準タスク4件を削除し、残る全タスクの部署を sales に統一
--
-- 各ステージの新しい表示名（コード側 types.ts）:
--   approaching→アプローチ中 / meeting_set→アポ / meeting_done→商談実施 / negotiating→条件調整
--   contract→開発引継ぎ / branding→5店舗獲得 / sv_ready→完了 / nurturing→ペンディング
--   lost→提案前NG / lost_after_proposal→提案後NG

begin;

-- 1. 制約を外す（外さないと UPDATE が通らない。0004 と同じ手順）
alter table public.deals drop constraint deals_stage_check;
alter table public.stage_events drop constraint stage_events_from_stage_check;
alter table public.stage_events drop constraint stage_events_to_stage_check;
alter table public.stage_task_templates drop constraint stage_task_templates_stage_check;

-- 2. sourced/picked 統合中のトリガーを一時停止（業務上の遷移ではないため履歴を汚さない）
alter table public.deals disable trigger deals_log_stage_event;
alter table public.deals disable trigger deals_set_updated_at;

-- 3. 既存の sourced/picked 案件（23件）をアプローチ中へ統合
update public.deals set stage = 'approaching' where stage in ('sourced', 'picked');

-- 4. トリガー再開
alter table public.deals enable trigger deals_log_stage_event;
alter table public.deals enable trigger deals_set_updated_at;

-- 5. 新規案件の既定ステージを approaching に変更（sourced はもう存在しないため）
alter table public.deals alter column stage set default 'approaching';

-- 6. deals.stage: sourced/picked を除外、lost_after_proposal を追加
alter table public.deals add constraint deals_stage_check
  check (stage in ('approaching', 'meeting_set', 'meeting_done', 'negotiating', 'contract',
                   'branding', 'sv_ready', 'nurturing', 'lost', 'lost_after_proposal'));

-- 7. stage_events: 過去の sourced/picked 履歴は保持したまま、今後の lost_after_proposal 遷移も
--    記録できるようにする（deals.stage とは許可値が非対称になる。意図的）
alter table public.stage_events add constraint stage_events_from_stage_check
  check (from_stage in ('sourced', 'picked', 'approaching', 'meeting_set', 'meeting_done',
                        'negotiating', 'contract', 'branding', 'sv_ready', 'nurturing', 'lost',
                        'lost_after_proposal'));

alter table public.stage_events add constraint stage_events_to_stage_check
  check (to_stage in ('sourced', 'picked', 'approaching', 'meeting_set', 'meeting_done',
                      'negotiating', 'contract', 'branding', 'sv_ready', 'nurturing', 'lost',
                      'lost_after_proposal'));

-- 8. picked 向けの標準タスク4件を削除（新しいステージ構成には引き継がない）
--    ※ 制約を追加する前に削除すること。先に制約を追加すると、残っている
--       picked 行が新しい許可値に違反してエラーになる。
delete from public.stage_task_templates where stage = 'picked';

-- 9. stage_task_templates.stage も同様に更新
alter table public.stage_task_templates add constraint stage_task_templates_stage_check
  check (stage in ('approaching', 'meeting_set', 'meeting_done', 'negotiating', 'contract',
                   'branding', 'sv_ready', 'nurturing', 'lost', 'lost_after_proposal'));

-- 10. 標準タスクの部署をすべて sales に統一
update public.stage_task_templates set department = 'sales';

commit;
