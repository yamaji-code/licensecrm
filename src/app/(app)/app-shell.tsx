"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Nav from "./nav";

/*
 * 画面の骨組み。
 * - 広い画面: サイドバー常時表示（従来どおり）
 * - 狭い画面: 上部バー＋引き出し（サイドバーが幅の6割を占めて本文が読めなくなるのを解消）
 * 開閉状態を持つためクライアント側。
 */
export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  // 遷移時の自動クローズは Nav の onNavigate（リンクの onClick）で行う。
  // 引き出しを開けている間は本文が覆われるため、閉じ忘れる経路は無い。
  const [open, setOpen] = useState(false);

  // 引き出しを開けている間は背面をスクロールさせない
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Esc で閉じられるようにする
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sidebar = (
    <>
      <div className="border-b border-brand-600 px-5 py-5">
        <Link href="/" className="inline-block">
          <Image
            src="/brand/logo-white.svg"
            alt="XKitchen"
            width={223}
            height={36}
            priority
            unoptimized
            className="h-6 w-auto"
          />
        </Link>
        <p className="mt-2 text-xs text-brand-200">ライセンス営業 CRM</p>
      </div>

      <Nav onNavigate={() => setOpen(false)} />

      <div className="border-t border-brand-600 px-5 py-4">
        <p className="truncate text-xs text-brand-200" title={email}>
          {email}
        </p>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="mt-2 text-xs text-brand-200 underline underline-offset-2 transition-colors hover:text-white"
          >
            ログアウト
          </button>
        </form>
      </div>
    </>
  );

  return (
    // dvh = モバイルのアドレスバー可変高で下端が隠れるのを防ぐ
    <div className="flex h-[100dvh] overflow-hidden">
      {/* 広い画面の固定サイドバー */}
      <aside className="hidden w-56 shrink-0 flex-col bg-brand-700 lg:flex">
        {sidebar}
      </aside>

      {/* 狭い画面の引き出し */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="メニューを閉じる"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="メニュー"
            className="absolute inset-y-0 left-0 flex w-64 max-w-[85%] flex-col bg-brand-700 shadow-pop"
          >
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 狭い画面の上部バー */}
        <header className="flex shrink-0 items-center gap-3 border-b border-line bg-white px-4 py-2.5 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="メニューを開く"
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/brand/logo.svg"
              alt="XKitchen"
              width={223}
              height={36}
              unoptimized
              className="h-5 w-auto"
            />
          </Link>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto bg-surface">
          {children}
        </main>
      </div>
    </div>
  );
}
