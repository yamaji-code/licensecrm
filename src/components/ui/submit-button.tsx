"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonSize, type ButtonVariant } from "./button";

/*
 * 送信中は押せなくして「送信中…」に変える。
 * 二重送信の防止と、押したのに何も起きないように見える時間の解消が目的。
 * form の中でのみ使うこと（useFormStatus は親フォームの状態を読む）。
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (pendingLabel ?? "送信中…") : children}
    </Button>
  );
}
