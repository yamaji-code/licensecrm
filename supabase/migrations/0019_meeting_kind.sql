-- 0019: MTG LOG に「種類」を持たせる（mtg / call / memo）。
--
-- これまで電話の記録や覚え書きも MTG LOG に混ざって入っていたため、
-- 「商談としてのMTG」だけを数えられるように種類で分ける。
--   mtg  … 商談・打ち合わせ（従来どおりの MTG LOG）
--   call … 電話（一覧では「電話」バッジ）
--   memo … 覚え書き（一覧では「メモ」バッジ）
-- 既存行は既定値の 'mtg' になる。

begin;

alter table public.meetings
  add column kind text not null default 'mtg'
    check (kind in ('mtg', 'call', 'memo'));

-- 既存データの救済: タイトルが受話器マークで始まるものは電話の記録とみなす。
update public.meetings
set kind = 'call'
where kind = 'mtg'
  and title like '📞%';

create index meetings_kind_idx on public.meetings (kind);

commit;
