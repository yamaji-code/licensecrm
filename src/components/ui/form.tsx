import type { ComponentProps, ReactNode } from "react";

/*
 * フォーム部品。入力欄の見た目・必須表示・エラー表示はここだけが持つ。
 * ラベルと入力は Field で必ず紐づける（id を渡さない使い方をしないこと）。
 */

const CONTROL =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-faint transition-colors " +
  "hover:border-brand-200 focus:border-brand-500 focus:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-faint " +
  "aria-[invalid=true]:border-danger";

// モバイルで入力時に画面が拡大されるのを防ぐため、入力欄は 16px を下回らせない
const CONTROL_SIZING = "min-h-10 text-base sm:text-sm";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return (
    <input
      className={[CONTROL, CONTROL_SIZING, className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={[CONTROL, "text-base sm:text-sm", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

export function Select({ className, ...rest }: ComponentProps<"select">) {
  return (
    <select
      className={[CONTROL, CONTROL_SIZING, "pr-8", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

type FieldProps = {
  /** 入力欄の id と紐づける。必須（ラベルクリックで入力欄に飛べるようにするため） */
  htmlFor: string;
  label: string;
  required?: boolean;
  /** 入力の判断材料。任意 */
  hint?: ReactNode;
  /** エラー文言。入れると赤字で出る */
  error?: string;
  children: ReactNode;
};

export function Field({
  htmlFor,
  label,
  required,
  hint,
  error,
  children,
}: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-sm font-medium text-ink"
      >
        {label}
        {required ? (
          <span className="text-xs font-normal text-danger">必須</span>
        ) : (
          <span className="text-xs font-normal text-ink-faint">任意</span>
        )}
      </label>
      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-ink-soft">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** フォームの下部に置く操作列。左に主ボタン、右に取り消し */
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
      {children}
    </div>
  );
}
