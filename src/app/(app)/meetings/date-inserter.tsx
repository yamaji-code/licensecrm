"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui";
import { addDays, jstDateString } from "@/lib/date";
import { formatDateMention } from "@/lib/date-mention";

const INPUT_CLASS =
  "h-8 rounded border border-line bg-white px-1.5 text-xs text-ink " +
  "focus:border-brand-500 focus:outline-none";

/**
 * 要旨に日付を入れるための小さなパネル。「@」を打つか「日付を挿入」で開く。
 *
 * 入る形は @2026/11/10（Tue）。月日だけで書くと1年後に見返して何年の話か
 * 分からなくなるため、年と曜日まで入れる。
 */
export function DateInserter({
  onInsert,
  onCancel,
}: {
  onInsert: (text: string) => void;
  onCancel: () => void;
}) {
  const today = jstDateString();
  const [date, setDate] = useState(today);

  const quickDates = [
    { label: "今日", value: today },
    { label: "明日", value: addDays(today, 1) },
    { label: "1週間後", value: addDays(today, 7) },
  ];

  // パネルはフォームの中にあるので、Enterでの意図しない送信を止めて挿入に充てる
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    onInsert(formatDateMention(date));
  }

  return (
    <div className="space-y-2 rounded-card border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        {quickDates.map((q) => (
          <Button
            key={q.label}
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onInsert(formatDateMention(q.value))}
          >
            {q.label}
            <span className="ml-1.5 text-ink-faint">
              {formatDateMention(q.value)}
            </span>
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
        <input
          type="date"
          className={INPUT_CLASS}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="挿入する日付"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onInsert(formatDateMention(date))}
        >
          この日付を挿入
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </div>
  );
}
