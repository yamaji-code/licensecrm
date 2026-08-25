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

// 日付セルをドロップ先にするラッパー。タスクを落とすとその日付に期日を変更する。
export function DropDay({
  date,
  action,
  children,
  className = "",
}: {
  date: string;
  action: (taskId: string, date: string) => Promise<void>;
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
        if (id) startTransition(() => action(id, date));
      }}
      className={`${className} ${
        over ? "ring-2 ring-inset ring-brand-400" : ""
      } ${isPending ? "opacity-60" : ""}`}
    >
      {children}
    </div>
  );
}
