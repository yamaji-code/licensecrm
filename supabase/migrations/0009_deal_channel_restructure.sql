-- 0009: 獲得チャネルを新4区分に刷新
--
-- 新チャネル: approach_list（アプローチリスト）/ partner_referral（協力者紹介）/
--            ishida_referral（石田紹介）/ yamaji_referral（山路紹介）
--
-- 既存データ: direct_list 42件・inbound 1件・other 41件（referral_customer/referral_allianceは0件）。
-- サヤカさんの指示により、手動移行はせず全件 approach_list へ一括変換する。
-- 旧チャネル（direct_list/inbound/other/referral_customer/referral_alliance）は
-- 変換後、許可値から完全に削除する。

begin;

update public.deals
set channel = 'approach_list'
where channel in ('direct_list', 'inbound', 'other');

alter table public.deals drop constraint deals_channel_check;

alter table public.deals add constraint deals_channel_check
  check (channel in (
    'approach_list', 'partner_referral', 'ishida_referral', 'yamaji_referral'
  ));

commit;
