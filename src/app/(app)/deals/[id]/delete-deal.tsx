"use client";

import { useRef } from "react";
import { Button, SubmitButton } from "@/components/ui";
import { deleteDeal } from "../actions";

/*
 * 案件の削除。取り消せない操作なので、押してすぐ消さずに確認を挟む。
 *
 * 削除すると何がどうなるかは、消える側・残る側の両方を確認画面に出す。
 * 「タスクやMTG LOGは残るが、どの案件のものか分からなくなる」のが
 * 一番気づきにくい影響なので、件数つきで明示する。
 */
export function DeleteDealButton({
  dealId,
  dealTitle,
  counts,
}: {
  dealId: string;
  dealTitle: string;
  counts: {
    tasks: number;
    meetings: number;
    knowledge: number;
    contacts: number;
    stageEvents: number;
  };
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 「残るが紐づきが外れる」もの。0件のものは並べても判断材料にならないので出さない
  const orphaned = [
    { label: "タスク", n: counts.tasks },
    { label: "MTG LOG", n: counts.meetings },
    { label: "ナレッジ", n: counts.knowledge },
  ].filter((x) => x.n > 0);

  // 一緒に消えるもの
  const removed = [
    { label: "担当者", n: counts.contacts },
    { label: "ステージの変更履歴", n: counts.stageEvents },
  ].filter((x) => x.n > 0);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-danger hover:bg-danger-bg"
        onClick={() => dialogRef.current?.showModal()}
      >
        この案件を削除
      </Button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-white p-0 shadow-card backdrop:bg-ink/40"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="max-h-[80vh] overflow-y-auto p-5">
          <h2 className="text-sm font-medium text-ink">案件を削除します</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            「{dealTitle}」を削除します。
            <span className="font-medium text-ink">元に戻せません。</span>
          </p>

          {removed.length > 0 && (
            <div className="mt-4 rounded-card border border-line bg-surface px-4 py-3">
              <p className="text-xs font-medium text-ink">一緒に消えるもの</p>
              <ul className="mt-1.5 space-y-0.5 text-xs text-ink-soft">
                {removed.map((x) => (
                  <li key={x.label}>
                    {x.label} {x.n} 件
                  </li>
                ))}
              </ul>
            </div>
          )}

          {orphaned.length > 0 && (
            <div className="mt-3 rounded-card border border-warn/25 bg-warn-bg px-4 py-3">
              <p className="text-xs font-medium text-warn">
                残りますが、案件との紐づきが外れます
              </p>
              <ul className="mt-1.5 space-y-0.5 text-xs text-warn">
                {orphaned.map((x) => (
                  <li key={x.label}>
                    {x.label} {x.n} 件
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] leading-relaxed text-warn">
                一覧には残りますが、どの案件のものか分からなくなります。先に移すか消すかを決めておくことをおすすめします。
              </p>
            </div>
          )}

          {removed.length === 0 && orphaned.length === 0 && (
            <p className="mt-3 text-xs text-ink-faint">
              この案件に紐づくタスク・MTG LOG・担当者はありません。
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <form action={deleteDeal}>
              <input type="hidden" name="id" value={dealId} />
              <SubmitButton variant="danger" size="sm" pendingLabel="削除中…">
                削除する
              </SubmitButton>
            </form>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => dialogRef.current?.close()}
            >
              キャンセル
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
