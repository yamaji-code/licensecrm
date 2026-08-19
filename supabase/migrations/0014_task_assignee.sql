-- 0014: タスクの担当者を固定2名（ishida / yamaji）から選ぶ列を追加する。
-- assignee_id（auth.users参照・登録者の自動記録用）とは別に、画面で選べる担当者を
-- 別列として持たせる（ログインユーザー＝担当者とは限らないため、選択式にする）。
-- 既存タスクは全件 ishida を割り当てる（現状の運用に合わせる）。

begin;

alter table public.tasks
  add column assignee text
    check (assignee in ('ishida', 'yamaji'));

update public.tasks set assignee = 'ishida' where assignee is null;

commit;
