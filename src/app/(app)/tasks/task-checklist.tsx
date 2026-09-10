"use client";

import { useRef, useState, useTransition } from "react";
import type { TaskChecklistItem } from "@/lib/types";
import {
  addChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
} from "./actions";

/*
 * タスク詳細パネルのサブタスク（チェックリスト）欄。
 * 「タイトル＋完了チェック」だけの軽い項目。担当者・期日は持たない。
 * 追加/チェック/削除はサーバーアクションを直接呼び、保存ボタンは持たない。
 */
export function TaskChecklist({
  taskId,
  items,
}: {
  taskId: string;
  items: TaskChecklistItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const doneCount = items.filter((i) => i.done).length;

  const submitDraft = () => {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    startTransition(() => {
      addChecklistItem(taskId, title);
    });
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">サブタスク</span>
        {items.length > 0 && (
          <span className="text-xs text-ink-soft">
            {doneCount}/{items.length}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.done}
                disabled={isPending}
                onChange={(e) =>
                  startTransition(() => {
                    toggleChecklistItem(item.id, e.target.checked);
                  })
                }
                className="h-4 w-4 shrink-0 rounded border-line"
                aria-label={`「${item.title}」を完了${item.done ? "から戻す" : "にする"}`}
              />
              <span
                className={`min-w-0 flex-1 truncate text-sm ${
                  item.done ? "text-ink-faint line-through" : "text-ink"
                }`}
              >
                {item.title}
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(() => {
                    deleteChecklistItem(item.id);
                  })
                }
                aria-label={`「${item.title}」を削除`}
                className="shrink-0 rounded p-1 text-xs text-ink-faint hover:bg-surface hover:text-danger"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          disabled={isPending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitDraft();
            }
          }}
          placeholder="サブタスクを追加…"
          className="min-h-9 flex-1 rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:outline-none disabled:bg-surface"
        />
        <button
          type="button"
          disabled={isPending || !draft.trim()}
          onClick={submitDraft}
          className="min-h-9 shrink-0 rounded-lg border border-line px-3 text-xs font-medium text-ink hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          追加
        </button>
      </div>
    </div>
  );
}
