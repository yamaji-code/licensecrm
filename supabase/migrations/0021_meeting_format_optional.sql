-- 0021: 区分（オンライン/オフライン）を MTG のときだけの項目にする。
--
-- call📞 や memo に「オンライン/オフライン」は意味がないため、
-- format を null 許可にして、MTG 以外は null で保存する。
-- 既存の call / memo の行も null に揃える。

begin;

alter table public.meetings
  alter column format drop not null;

update public.meetings
set format = null
where kind <> 'mtg';

commit;
