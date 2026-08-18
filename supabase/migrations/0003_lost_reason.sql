-- 見送り・失注理由の記録
-- 旧XKitchen Notion CRM の実データ（82件）を精査した結果、ステータスの自由記述に
-- 「提案前NG」「提案後NG」の2種の見送り理由が既に運用されていたことを確認した。
-- deals.stage が 'nurturing'（見送り）/ 'lost'（失注）に遷移する際、
-- どのフェーズで・なぜ止まったかを記録できるようにする。

-- =========================================================
-- deals: 見送り・失注理由
-- =========================================================
alter table public.deals
  add column if not exists lost_reason_phase text
    check (lost_reason_phase in ('before_proposal', 'after_proposal', 'other'));
alter table public.deals
  add column if not exists lost_reason_note text;
