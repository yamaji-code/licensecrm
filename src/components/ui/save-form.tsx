"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { SubmitButton } from "./submit-button";
import type { ButtonSize, ButtonVariant } from "./button";

/*
 * 保存の成否を画面に出すフォーム。
 *
 * 従来は保存が終わってもボタンの文字が戻るだけで、成功したのか失敗したのかが
 * 分からなかった（実際は保存できているのに「固まっている」ように見えていた）。
 * サーバーアクションの結果を受け取って、ボタンの横に結果を出す。
 *
 * 失敗しても入力内容は画面に残る（フォームを作り直さないため）。
 */

export type SaveResult = {
  ok: boolean;
  message: string;
  /** 同じ文言が続いたときも「新しく保存された」と分かるようにする */
  at: number;
} | null;

export type SaveAction = (
  prev: SaveResult,
  formData: FormData,
) => Promise<SaveResult>;

// 送信中は前回の結果を消す（古い「保存しました」が残って誤解を生まないように）
function SaveMessage({ state }: { state: SaveResult }) {
  const { pending } = useFormStatus();
  if (pending || !state) return null;

  return (
    <p
      // 保存は目で追っていないことがあるので、読み上げにも伝える
      role="status"
      aria-live="polite"
      className={`text-xs ${state.ok ? "text-ok" : "text-danger"}`}
    >
      {state.ok ? state.message : `${state.message}（もう一度お試しください）`}
    </p>
  );
}

export function SaveForm({
  action,
  children,
  submitLabel = "保存",
  pendingLabel = "保存中…",
  submitVariant,
  submitSize,
  closeDialogOnSuccess = false,
  className = "space-y-4",
}: {
  action: SaveAction;
  children: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  /** 既存画面のボタンの見た目に合わせたいときに渡す */
  submitVariant?: ButtonVariant;
  submitSize?: ButtonSize;
  /**
   * ポップアップ（<dialog>）の中で使うとき、保存に成功したら自動で閉じる。
   * 開いたままだと一覧が隠れて邪魔になるため。失敗時は閉じない（やり直せるように）。
   */
  closeDialogOnSuccess?: boolean;
  className?: string;
}) {
  const [state, formAction] = useActionState<SaveResult, FormData>(
    action,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // 「保存しました」が一瞬見えてから閉じる（閉じるだけだと保存できたか分からないため）
  useEffect(() => {
    if (!closeDialogOnSuccess || !state?.ok) return;
    const timer = setTimeout(() => {
      formRef.current?.closest("dialog")?.close();
    }, 700);
    return () => clearTimeout(timer);
  }, [closeDialogOnSuccess, state]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton
          pendingLabel={pendingLabel}
          variant={submitVariant}
          size={submitSize}
        >
          {submitLabel}
        </SubmitButton>
        <SaveMessage state={state} />
      </div>
    </form>
  );
}
