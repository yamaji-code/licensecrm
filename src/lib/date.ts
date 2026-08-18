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

// 以下、タスクカレンダー（日/週/月表示）用の日付計算。
// due_date は時刻を持たない YYYY-MM-DD 文字列なので、UTC 固定で扱いローカルタイムゾーンのずれを避ける。

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + months, d)).toISOString().slice(0, 10);
}

// 日曜始まりの週の開始日（日〜土）
export function startOfWeek(dateStr: string): string {
  const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return addDays(dateStr, -dow);
}

export function startOfMonth(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

// 週表示用: 対象日を含む週（日〜土）の7日分
export function weekDates(dateStr: string): string[] {
  const start = startOfWeek(dateStr);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// 月表示用: 月の1日を含む週の日曜〜末日を含む週の土曜までを7日区切りで返す
export function monthGridDates(dateStr: string): string[] {
  const gridStart = startOfWeek(startOfMonth(dateStr));
  const nextMonthStart = addMonths(startOfMonth(dateStr), 1);
  const gridEnd = addDays(startOfWeek(addDays(nextMonthStart, -1)), 6);
  const dates: string[] = [];
  for (let cur = gridStart; cur <= gridEnd; cur = addDays(cur, 1)) {
    dates.push(cur);
  }
  return dates;
}
