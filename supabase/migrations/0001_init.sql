-- License CRM 初期スキーマ
-- 取引先 / 担当者 / タスク ＋ RLS（ログイン済みメンバーのみ CRUD 可）
-- Supabase の SQL Editor に貼り付けて実行する。

-- updated_at 自動更新用トリガー関数
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- companies（取引先・顧客）
-- =========================================================
create table if not exists public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  name_kana   text,
  status      text not null default 'prospect'
                check (status in ('prospect', 'negotiating', 'active', 'lost')),
  industry    text,
  phone       text,
  website     text,
  address     text,
  note        text,
  owner_id    uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists companies_status_idx on public.companies (status);
create index if not exists companies_name_idx on public.companies (name);

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- =========================================================
-- contacts（担当者）
-- =========================================================
create table if not exists public.contacts (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references public.companies (id) on delete cascade,
  name        text not null,
  name_kana   text,
  title       text,
  email       text,
  phone       text,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists contacts_company_id_idx on public.contacts (company_id);

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- =========================================================
-- tasks（タスク）
-- =========================================================
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  status       text not null default 'todo'
                 check (status in ('todo', 'doing', 'done')),
  priority     text not null default 'medium'
                 check (priority in ('low', 'medium', 'high')),
  due_date     date,
  company_id   uuid references public.companies (id) on delete set null,
  contact_id   uuid references public.contacts (id) on delete set null,
  assignee_id  uuid references auth.users (id) on delete set null,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists tasks_company_id_idx on public.tasks (company_id);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- =========================================================
-- RLS: ログイン済みユーザーのみ全操作を許可（社内専用）
-- =========================================================
alter table public.companies enable row level security;
alter table public.contacts  enable row level security;
alter table public.tasks     enable row level security;

create policy "authenticated can read companies"   on public.companies for select to authenticated using (true);
create policy "authenticated can write companies"   on public.companies for insert to authenticated with check (true);
create policy "authenticated can update companies"  on public.companies for update to authenticated using (true) with check (true);
create policy "authenticated can delete companies"  on public.companies for delete to authenticated using (true);

create policy "authenticated can read contacts"     on public.contacts  for select to authenticated using (true);
create policy "authenticated can write contacts"    on public.contacts  for insert to authenticated with check (true);
create policy "authenticated can update contacts"   on public.contacts  for update to authenticated using (true) with check (true);
create policy "authenticated can delete contacts"   on public.contacts  for delete to authenticated using (true);

create policy "authenticated can read tasks"        on public.tasks     for select to authenticated using (true);
create policy "authenticated can write tasks"       on public.tasks     for insert to authenticated with check (true);
create policy "authenticated can update tasks"      on public.tasks     for update to authenticated using (true) with check (true);
create policy "authenticated can delete tasks"      on public.tasks     for delete to authenticated using (true);
