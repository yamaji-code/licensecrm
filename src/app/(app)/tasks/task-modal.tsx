"use client";

import { useRef, type ReactNode } from "react";

/*
 * タスクの詳細をポップアップで開くための土台。
 * 中身（フォームなど）はサーバーコンポーネント側で作って children として渡す。
 * ネイティブ <dialog> を使うことで、開閉のためだけの状態管理を増やさずに済む
 * （Escで閉じる・背景クリックで閉じる・フォーカストラップはブラウザ標準機能に任せる）。
 */
export function TaskModalTrigger({
  trigger,
  triggerClassName,
  children,
}: {
  trigger: ReactNode;
  triggerClassName?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => dialogRef.current?.showModal()}
      >
        {trigger}
      </button>
      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-white p-0 shadow-card backdrop:bg-ink/40"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
      </dialog>
    </>
  );
}
