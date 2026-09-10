-- 0017: タスクに「繰り返し」を持たせる。
-- recurrence が null なら通常タスク。daily/weekly/biweekly/monthly のいずれかなら繰り返し。
--
-- 期限切れの繰り返しタスクを次回分へ繰り上げる関数 advance_recurring_tasks() も追加する。
-- これはタスク画面を開いたときにアプリから呼ばれる（cron不要の「開いた時に追いつかせる」方式）。

begin;

alter table public.tasks
  add column recurrence text
    check (recurrence in ('daily', 'weekly', 'biweekly', 'monthly'));

-- 期限が過ぎている（due_date < 今日）繰り返しタスクを、今日以降の最初の該当日まで繰り上げる。
-- 完了済み（status = 'done'）は対象外。SECURITY INVOKER のまま（呼び出したログインユーザー
-- 権限で動く）＝ tasks の RLS「authenticated は update 可」に従う。
create or replace function public.advance_recurring_tasks()
returns void
language plpgsql
as $$
declare
  jst_today date := (now() at time zone 'Asia/Tokyo')::date;
  r record;
  d date;
begin
  for r in
    select id, recurrence, due_date
    from public.tasks
    where recurrence is not null
      and status <> 'done'
      and due_date is not null
      and due_date < jst_today
  loop
    d := r.due_date;
    -- 暴走防止に最大 4000 回で打ち切る（毎日でも 10 年以上ぶんをカバー）
    for _i in 1..4000 loop
      exit when d >= jst_today;
      d := case r.recurrence
        when 'daily'    then d + 1
        when 'weekly'   then d + 7
        when 'biweekly' then d + 14
        when 'monthly'  then (d + interval '1 month')::date
        else d + 1
      end;
    end loop;
    update public.tasks set due_date = d where id = r.id;
  end loop;
end;
$$;

grant execute on function public.advance_recurring_tasks() to authenticated;

commit;
