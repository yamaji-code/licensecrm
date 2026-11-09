/*
 * MTG LOG・call・memo の本文に入れる日付のメンション。
 *
 * 「11/12に再連絡」のように月日だけで書かれると、1年後に見返したときに
 * 何年の話か分からない。年と曜日を含む @2026/11/10（Tue） の形で入れる。
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** 2026-11-10 → @2026/11/10（Tue）。曜日がずれないよう UTC 固定で読む */
export function formatDateMention(dateStr: string): string {
  const weekday = WEEKDAYS[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];
  return `@${dateStr.replaceAll("-", "/")}（${weekday}）`;
}

/*
 * 本文からメンションを拾う。曜日は後から手で直されることもあるので
 * 中身は見ずに、括弧の有無と長さだけで判断する。
 */
function mentionPattern(): RegExp {
  return /@\d{4}\/\d{1,2}\/\d{1,2}(?:[（(][^）)]{1,4}[）)])?/g;
}

export type TextPart = { text: string; isMention: boolean };

/** 文字列を、メンションとそれ以外に切り分ける（表示側で色を変えるため） */
export function splitDateMentions(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(mentionPattern())) {
    const start = match.index;
    if (start > last) parts.push({ text: text.slice(last, start), isMention: false });
    parts.push({ text: match[0], isMention: true });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), isMention: false });
  return parts;
}
