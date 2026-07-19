// JST（Asia/Tokyo）の UTC オフセット
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * JST 基準の「今日 + offsetDays」を YYYY-MM-DD で返す。
 * タスクの期日は日付のみ（時刻なし）で持っているため、期限切れ判定は JST の日付で行う。
 */
export function jstDateString(offsetDays = 0): string {
  return new Date(Date.now() + JST_OFFSET_MS + offsetDays * 86400000)
    .toISOString()
    .slice(0, 10);
}
