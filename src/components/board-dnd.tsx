"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { moveDealToStage } from "@/app/(app)/deals/actions";

// カードを掴んでドラッグできるようにするラッパー。
// カードの中身（サーバー描画）はそのまま children として受け取る。
export function DraggableCard({
  dealId,
  children,
}: {
  dealId: string;
  children: ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", dealId);
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={`cursor-grab active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      }`}
    >
      {children}
    </div>
  );
}

// ステージ列をドロップ先にするラッパー。カードを落とすとそのステージへ移動する。
export function DropColumn({
  stage,
  children,
  className = "",
}: {
  stage: string;
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
        if (id) startTransition(() => moveDealToStage(id, stage));
      }}
      className={`${className} ${
        over ? "rounded-2xl ring-2 ring-inset ring-brand-400" : ""
      } ${isPending ? "opacity-60" : ""}`}
    >
      {children}
    </div>
  );
}
