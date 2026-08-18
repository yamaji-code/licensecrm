-- 0012: MTG LOG 強化（よく使う文章の再利用＋商談資料・現場写真の添付）
--
-- ① meeting_snippets: よく使う文章（決まり文句・議事メモのテンプレ）を登録し、
--    MTG LOG入力時に呼び出して挿入できるようにする。
-- ② storage バケット meeting-images: 商談中の資料や現場の写真を添付するための保存先。
--    添付画像は meetings.summary（markdown）内に画像リンクとして挿入する運用のため、
--    添付を紐づける専用テーブルは持たない。
-- ③ 表（条件交渉の項目比較など）は新規カラム不要。summary を markdown として扱い、
--    表示側で markdown レンダリングに変更することで対応する（アプリ側のみの変更）。

begin;

create table if not exists public.meeting_snippets (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.meeting_snippets enable row level security;

create policy "authenticated can read meeting_snippets"
  on public.meeting_snippets for select to authenticated using (true);
create policy "authenticated can write meeting_snippets"
  on public.meeting_snippets for insert to authenticated with check (true);
create policy "authenticated can update meeting_snippets"
  on public.meeting_snippets for update to authenticated using (true) with check (true);
create policy "authenticated can delete meeting_snippets"
  on public.meeting_snippets for delete to authenticated using (true);

insert into storage.buckets (id, name, public)
values ('meeting-images', 'meeting-images', true)
on conflict (id) do nothing;

create policy "authenticated can upload meeting images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'meeting-images');

create policy "authenticated can read meeting images"
  on storage.objects for select to authenticated
  using (bucket_id = 'meeting-images');

create policy "authenticated can delete meeting images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'meeting-images');

commit;
