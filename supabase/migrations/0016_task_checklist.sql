-- 0016: タスクに「サブタスク（チェックリスト項目）」を持たせる。
-- サブタスクは担当者・優先度・期日を持たない軽い項目で、親タスクの詳細パネルから
-- 追加・チェック・削除する。親タスク削除時は一緒に消える（on delete cascade）。

begin;

create table public.task_checklist_items (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  title       text not null,
  done        boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index task_checklist_items_task_id_idx
  on public.task_checklist_items (task_id);

alter table public.task_checklist_items enable row level security;

create policy "authenticated can read task_checklist_items"
  on public.task_checklist_items for select to authenticated using (true);
create policy "authenticated can write task_checklist_items"
  on public.task_checklist_items for insert to authenticated with check (true);
create policy "authenticated can update task_checklist_items"
  on public.task_checklist_items for update to authenticated using (true) with check (true);
create policy "authenticated can delete task_checklist_items"
  on public.task_checklist_items for delete to authenticated using (true);

commit;
