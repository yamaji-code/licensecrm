"use client";

import { useEffect, useState, useTransition } from "react";
import type { TaskWithCompany } from "./task-types";

/*
 * カレンダー表示の「完了」チェック丸ボタン。
 * これまでは素の <button type="submit"> で、押してからページ全体の再検証が
 * 終わるまで見た目が一切変わらなかった（再検証が重いと「押しても反応しない」
 * ように見える）。押した瞬間にチェックを反映し、サーバー確定値が届いたら
 * それに合わせ直す（楽観更新）。
 *
 * 繰り返しタスクは「完了」にしても止めず次回分へ進むだけ（toggleTaskDone
 * 参照）なので、確定値は done=false のまま返ってくる。その場合はチェックが
 * 一瞬つき、確定後に外れて元に戻る＝次回分へ進んだことが見た目でも分かる。
 */
export function DoneToggle({
  task,
  action,
}: {
  task: TaskWithCompany;
  action: (formData: FormData) => Promise<void>;
}) {
  const done = task.status === "done";
  const [isPending, startTransition] = useTransition();
  const [optimisticDone, setOptimisticDone] = useState(done);

  // サーバーの確定値（再検証後の task.status）が変わったら追従する
  useEffect(() => {
    setOptimisticDone(done);
  }, [done]);

  return (
    <button
      type="button"
      aria-label={optimisticDone ? "未完了に戻す" : "完了にする"}
      aria-pressed={optimisticDone}
      disabled={isPending}
      onClick={() => {
        const next = !optimisticDone;
        setOptimisticDone(next);
        const formData = new FormData();
        formData.set("id", task.id);
        formData.set("done", String(next));
        startTransition(() => {
          action(formData);
        });
      }}
      className="-m-2 flex h-10 w-10 items-center justify-center rounded-full disabled:cursor-wait"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs transition-colors ${
          optimisticDone
            ? "border-ok bg-ok text-white"
            : "border-line text-transparent hover:border-brand-500"
        }`}
      >
        ✓
      </span>
    </button>
  );
}
