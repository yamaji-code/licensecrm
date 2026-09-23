-- 0020: MTG LOG のタイトルを任意項目にする。
--
-- call📞 や memo は「タイトルを付けるほどでもない」記録が多く、
-- タイトル必須が入力の手間になっていたため null を許可する。
-- 表示側はタイトルが無いとき「種類 + 実施日」で代替表示する。

begin;

alter table public.meetings
  alter column title drop not null;

-- 空文字で保存されていた分は null に寄せる（表示側の判定を is null だけにするため）
update public.meetings
set title = null
where btrim(title) = '';

commit;
