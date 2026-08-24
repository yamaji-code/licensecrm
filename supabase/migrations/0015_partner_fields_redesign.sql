-- 0015: パートナーの登録項目を「名前・法人名・電話番号・メールアドレス・
-- 誰からの紹介か・得意領域・ランク・紹介手数料・メモ」に合わせて再設計する。
-- 種別（partner_type）・窓口担当者名（contact_name）・かな（name_kana）は
-- 新しい項目リストに無いため廃止する。
--
-- あわせて、案件のステージに相当するパートナーの関係性ステータス（stage）を追加する。
-- 看板（ドラッグ&ドロップ）UIは今回作らず、列とバッジ表示のみ先に用意する。

begin;

alter table public.partners
  add column company_name  text,
  add column referred_by   text,
  add column specialty     text,
  add column rank          text check (rank in ('S', 'A', 'B', 'C')),
  add column referral_fee  text,
  add column stage         text not null default 'initial_mtg'
                              check (stage in ('initial_mtg', 'active', 'follow_up', 'pending'));

alter table public.partners
  drop column name_kana,
  drop column partner_type,
  drop column contact_name;

commit;
