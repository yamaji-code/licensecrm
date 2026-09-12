-- 0018: 期日漏れタスクを自動で「翌営業日（土日祝を除く）」へ移す。
--
-- これまで石田さんが定期的に手動で「期日が過ぎたタスクを全部○月○日に移動して」と
-- 依頼していたのを自動化する。繰り返しタスク（advance_recurring_tasks 参照）と同じく
-- cronは使わず、タスク画面を開いたときにアプリから呼んで追いつかせる方式にする。
--
-- 祝日は法律で定められた固定の休みではない年もある（春分の日・秋分の日など）ため、
-- jp_holidays テーブルに日付を持たせる。今回は内閣府発表の 2026年（令和8年）分のみ
-- 登録済み。年をまたぐ場合は都度このテーブルに追加が必要（出典:
-- https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html）。

begin;

create table public.jp_holidays (
  holiday_date date primary key,
  name         text not null
);

alter table public.jp_holidays enable row level security;

create policy jp_holidays_read
  on public.jp_holidays for select to authenticated using (true);
create policy jp_holidays_insert
  on public.jp_holidays for insert to authenticated with check (true);
create policy jp_holidays_update
  on public.jp_holidays for update to authenticated using (true) with check (true);
create policy jp_holidays_delete
  on public.jp_holidays for delete to authenticated using (true);

-- 2026年（令和8年）の国民の祝日・休日。内閣府発表分をそのまま登録する。
insert into public.jp_holidays (holiday_date, name) values
  ('2026-01-01', '元日'),
  ('2026-01-12', '成人の日'),
  ('2026-02-11', '建国記念の日'),
  ('2026-02-23', '天皇誕生日'),
  ('2026-03-20', '春分の日'),
  ('2026-04-29', '昭和の日'),
  ('2026-05-03', '憲法記念日'),
  ('2026-05-04', 'みどりの日'),
  ('2026-05-05', 'こどもの日'),
  ('2026-05-06', '休日（祝日法第3条第2項）'),
  ('2026-07-20', '海の日'),
  ('2026-08-11', '山の日'),
  ('2026-09-21', '敬老の日'),
  ('2026-09-22', '休日（祝日法第3条第3項）'),
  ('2026-09-23', '秋分の日'),
  ('2026-10-12', 'スポーツの日'),
  ('2026-11-03', '文化の日'),
  ('2026-11-23', '勤労感謝の日')
on conflict (holiday_date) do nothing;

-- 指定日以降で、最初に来る土日祝日以外の日を返す（指定日自体が平日ならその日を返す）。
create or replace function public.next_business_day(d date)
returns date
language plpgsql
as $$
declare
  result date := d;
begin
  for _i in 1..30 loop
    exit when extract(isodow from result) < 6
      and not exists (select 1 from public.jp_holidays where holiday_date = result);
    result := result + 1;
  end loop;
  return result;
end;
$$;

-- 期限が過ぎている（due_date < 今日）未完了タスクを、今日から見た次の営業日へ移す。
-- 繰り返しタスクは advance_recurring_tasks が別途面倒を見るのでここでは対象外にする。
create or replace function public.advance_overdue_tasks()
returns void
language plpgsql
as $$
declare
  jst_today date := (now() at time zone 'Asia/Tokyo')::date;
  target date;
begin
  target := public.next_business_day(jst_today);
  update public.tasks
  set due_date = target
  where status <> 'done'
    and due_date is not null
    and due_date < jst_today
    and recurrence is null;
end;
$$;

grant execute on function public.next_business_day(date) to authenticated;
grant execute on function public.advance_overdue_tasks() to authenticated;

commit;
