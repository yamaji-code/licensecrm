// 営業 KPI の定数と四半期計算ユーティリティ

// 会計年度の開始月（1 = 暦年四半期）。山路さん確認済み（2026-07-14・1月始まり）。
export const FISCAL_YEAR_START_MONTH = 1;

// 四半期あたりの KPI 目標値（商談実施 / 契約 の件数）
export const KPI_TARGET = { meetings: 20, contracts: 2 } as const;

// JST（Asia/Tokyo）の UTC オフセット
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// now が属する四半期の範囲を JST（Asia/Tokyo）基準で返す。
// サーバーが UTC で動いていても正しく判定できるよう、タイムゾーン変換をこの関数に閉じ込める。
// start は含む・end は含まない（end ちょうどの時刻は次の四半期）。
// label は「会計年度の年 + 四半期番号」（例: "2026 Q3"）。
export function getQuarterRange(now: Date = new Date()): {
  start: Date;
  end: Date;
  label: string;
} {
  // JST での「今の年・月」を求める（UTC に 9 時間足してから UTC として読む）
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth() + 1; // 1〜12

  // 会計年度の開始年と、年度内で何番目の四半期か
  const fiscalYear = month >= FISCAL_YEAR_START_MONTH ? year : year - 1;
  const monthsFromFyStart = (month - FISCAL_YEAR_START_MONTH + 12) % 12;
  const quarterIndex = Math.floor(monthsFromFyStart / 3); // 0〜3

  // 四半期の開始月（暦上の年をまたぐ場合があるので Date.UTC のオーバーフローに任せる）
  const startMonth = FISCAL_YEAR_START_MONTH + quarterIndex * 3;

  // JST の月初 0:00 = UTC ではその 9 時間前
  const start = new Date(Date.UTC(fiscalYear, startMonth - 1, 1) - JST_OFFSET_MS);
  const end = new Date(Date.UTC(fiscalYear, startMonth - 1 + 3, 1) - JST_OFFSET_MS);

  return { start, end, label: `${fiscalYear} Q${quarterIndex + 1}` };
}
