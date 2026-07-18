import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/*
 * ボタンの見た目はここだけが持つ。各ページで className を直書きしないこと。
 * variant の使い分け:
 *   primary   = その画面の主目的（1画面に1つ。増やすと主導線が消える）
 *   secondary = 併記する操作
 *   ghost     = ツールバー内の弱い操作・切り替え
 *   danger    = 取り消せない操作のみ（期限切れ以外で赤を使わない規律）
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const SIZE: Record<ButtonSize, string> = {
  // モバイルのタップ判定を確保するため md は 40px 高を下回らせない
  sm: "min-h-8 px-2.5 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
};

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900",
  secondary:
    "border border-line bg-white text-ink hover:bg-brand-50 hover:border-brand-200",
  ghost: "text-ink-soft hover:bg-brand-50 hover:text-brand-700",
  danger: "bg-danger text-white hover:brightness-95 active:brightness-90",
};

export function buttonClass(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  extra?: string,
) {
  return [BASE, SIZE[size], VARIANT[variant], extra].filter(Boolean).join(" ");
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: ButtonProps) {
  return <button className={buttonClass(variant, size, className)} {...rest} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

/** 見た目はボタン・実体はリンク。遷移するものは必ずこちらを使う（右クリックで開けるようにするため） */
export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
