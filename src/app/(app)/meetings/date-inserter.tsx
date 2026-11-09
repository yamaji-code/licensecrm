"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui";
import { addDays, jstDateString } from "@/lib/date";

/** 2026-11-12 → 2026/11/12。1年後に見返しても分かるよう、年から入れる */
export function formatInsertedDate(dateStr: string): string {
  return dateStr.replaceAll("-", "/");
}

const INPUT_CLASS =
  "h-8 rounded border border-line bg-white px-1.5 text-xs text-ink " +
  "focus:border-brand-500 focus:outline-none";

/**
 * 要旨に日付を入れるための小さなパネル。「@」を打つか「日付を挿入」で開く。
 *
 * MTG LOG・call・memo は「11/12に再連絡」のように月日だけで書かれがちで、
 * 1年後に見返すと何年の話か分からなくなる。年を含む形で入れられるようにする。
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
    onInsert(formatInsertedDate(date));
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
            onClick={() => onInsert(formatInsertedDate(q.value))}
          >
            {q.label}
            <span className="ml-1.5 text-ink-faint">
              {formatInsertedDate(q.value)}
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
          onClick={() => onInsert(formatInsertedDate(date))}
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
