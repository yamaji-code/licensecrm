"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";

/*
 * 週/月カレンダーでタスクをドラッグして期日を変えるための土台。
 * 案件ボード（board-dnd.tsx）と同じネイティブ Drag and Drop の作りだが、
 * 移動先の値（曜日のセル）を汎用的に受け取れるよう action を外から渡す。
 */

// タスクを掴んでドラッグできるようにするラッパー。
// TaskChip のように中身が <li> を自前で持つ場合は as="li" にして
// <ul> の直下が <li> になるようにする（<ul><div><li> という無効なネストを避ける）。
export function DraggableTask({
  taskId,
  children,
  className = "",
  as = "div",
}: {
  taskId: string;
  children: ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const [dragging, setDragging] = useState(false);
  const Tag = as;
  return (
    <Tag
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", taskId);
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={`cursor-grab active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

// 「期限切れをまとめて移動」チップがドラッグ中であることを表す印。
// タスクIDは uuid なので、この値と衝突することはない。
const OVERDUE_BULK_ID = "__overdue_bulk__";

// 期限切れタスクをまとめて掴めるチップ。日付セルへ落とすと、その日へ全件移す。
export function OverdueBulkHandle({ count }: { count: number }) {
  const [dragging, setDragging] = useState(false);
  return (
    <span
      draggable
      role="button"
      title="ドラッグして日付セルに落とすと、期限切れのタスクをその日へまとめて移動します"
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", OVERDUE_BULK_ID);
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={`inline-flex cursor-grab select-none items-center gap-1.5 rounded-md border border-danger/25 bg-danger-bg px-2 py-1 text-xs font-medium text-danger active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3 w-3"
        fill="currentColor"
      >
        <circle cx="5" cy="4" r="1.3" />
        <circle cx="11" cy="4" r="1.3" />
        <circle cx="5" cy="8" r="1.3" />
        <circle cx="11" cy="8" r="1.3" />
        <circle cx="5" cy="12" r="1.3" />
        <circle cx="11" cy="12" r="1.3" />
      </svg>
      期限切れ {count} 件をまとめて移動
    </span>
  );
}

// 日付セルをドロップ先にするラッパー。タスクを落とすとその日付に期日を変更する。
// 「まとめて移動」チップが落ちたときは bulkAction（期限切れ全件をその日へ）を呼ぶ。
export function DropDay({
  date,
  action,
  bulkAction,
  children,
  className = "",
}: {
  date: string;
  action: (taskId: string, date: string) => Promise<void>;
  bulkAction?: (date: string) => Promise<void>;
  children: ReactNode;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!over) setOver(true);
      }}
      onDragLeave={(e) => {
        // 子要素へ移動しただけの dragleave は無視する
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (!id) return;
        if (id === OVERDUE_BULK_ID) {
          if (bulkAction) startTransition(() => bulkAction(date));
          return;
        }
        startTransition(() => action(id, date));
      }}
      className={`${className} ${
        over ? "ring-2 ring-inset ring-brand-400" : ""
      } ${isPending ? "opacity-60" : ""}`}
    >
      {children}
    </div>
  );
}
