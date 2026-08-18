-- 0007: 法人名（companies.legal_name）を削除
-- 会社名（companies.name）を案件タブから直接編集できるようにしたため、
-- 別立ての法人名フィールドは不要になった（サヤカさんの依頼で削除）。

begin;

alter table public.companies
  drop column if exists legal_name;

commit;
