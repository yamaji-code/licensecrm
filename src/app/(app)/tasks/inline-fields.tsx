"use client";

import { useTransition } from "react";

/*
 * タスク一覧の行内で直接値を変える担当者・期日・優先度・ステータス用のコントロール。
 * 選ぶ/入力するだけでサーバーアクションを直接呼び、保存ボタンは持たない
 * （Asanaのリスト表示に合わせて、行を出たまま完結させるため）。
 * key に現在値を含めることで、他経路（右パネルの編集フォーム等）での更新後も
 * defaultValue が最新化される（uncontrolledな要素を強制的に作り直す）。
 */

type FieldAction = (id: string, value: string) => Promise<void>;

// 文字色・背景色はここに含めない。呼び出し側（優先度/ステータスの配色など）と
// 二重に指定すると、Tailwindの生成順によってはどちらが勝つか分からなくなるため、
// 色の指定は必ず呼び出し側の className 一箇所にまとめる。
const CONTROL =
  "w-full min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs " +
  "hover:border-line hover:bg-white focus:border-brand-500 focus:bg-white focus:outline-none " +
  "disabled:cursor-not-allowed disabled:opacity-60";

function useInlineChange(taskId: string, action: FieldAction) {
  const [isPending, startTransition] = useTransition();
  const onChange = (value: string) => {
    startTransition(() => {
      action(taskId, value);
    });
  };
  return { isPending, onChange };
}

function usePendingAction(taskId: string, action: FieldAction) {
  const [isPending, startTransition] = useTransition();
  const commit = (value: string) => {
    startTransition(() => {
      action(taskId, value);
    });
  };
  return { isPending, commit };
}

export function InlineSelect({
  taskId,
  value,
  options,
  action,
  className,
  ariaLabel,
}: {
  taskId: string;
  value: string;
  options: readonly (readonly [string, string])[];
  action: FieldAction;
  className?: string;
  ariaLabel: string;
}) {
  const { isPending, onChange } = useInlineChange(taskId, action);
  return (
    <select
      key={value}
      aria-label={ariaLabel}
      defaultValue={value}
      disabled={isPending}
      onChange={(e) => onChange(e.target.value)}
      className={[CONTROL, className].filter(Boolean).join(" ")}
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function InlineDateInput({
  taskId,
  value,
  action,
  className,
  ariaLabel,
}: {
  taskId: string;
  value: string;
  action: FieldAction;
  className?: string;
  ariaLabel: string;
}) {
  const { isPending, commit } = usePendingAction(taskId, action);
  // 日付入力は年/月/日をセグメントごとに複数キーで打ち込む。onChange（1桁変わる
  // たびに発火する）で毎回保存すると、まだ入力途中の値（例: 年の1桁目だけ打った
  // 状態）を保存してしまい、しかも保存中は disabled になって残りの桁が打てなく
  // なる。そのため入力欄を離れた時（blur）か Enter でまとめて保存する。
  // ブラウザは日付が未確定（入力途中）だと value を空文字にするため、
  // 空文字や元の値と同じ場合は何もしない。
  const handleCommit = (v: string) => {
    if (v && v !== value) {
      commit(v);
    }
  };
  return (
    <input
      key={value}
      type="date"
      aria-label={ariaLabel}
      defaultValue={value}
      disabled={isPending}
      onBlur={(e) => handleCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handleCommit(e.currentTarget.value);
          e.currentTarget.blur();
        }
      }}
      className={[CONTROL, className].filter(Boolean).join(" ")}
    />
  );
}
