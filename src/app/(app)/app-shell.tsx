"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import Nav from "./nav";

/*
 * 画面の骨組み。
 * - 広い画面: サイドバー常時表示（従来どおり）
 * - 狭い画面: 上部バー＋引き出し（サイドバーが幅の6割を占めて本文が読めなくなるのを解消）
 * 開閉状態を持つためクライアント側。
 */
const SIDEBAR_KEY = "sidebar-collapsed";
const collapsedListeners = new Set<() => void>();

function subscribeCollapsed(onChange: () => void) {
  collapsedListeners.add(onChange);
  return () => {
    collapsedListeners.delete(onChange);
  };
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    // プライベートウィンドウ等で読めない場合は既定（展開）のままでよい
    return false;
  }
}

function writeCollapsed(next: boolean) {
  try {
    localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
  } catch {
    // 保存できなくても開閉自体は動かしたいので、ここでは何もしない
  }
  collapsedListeners.forEach((listener) => listener());
}

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
  // 広い画面のサイドバー折りたたみ。次に開いた時も同じ状態にしたいので localStorage に残す。
  // サーバー描画時は常に「展開」を返し、読み込み後に保存値へ切り替える（食い違いを防ぐ）。
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    readCollapsed,
    () => false,
  );
  const toggleCollapsed = () => writeCollapsed(!collapsed);

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

  const renderSidebar = (isCollapsed: boolean) => (
    <>
      <div
        className={`border-b border-brand-700 py-4 ${
          isCollapsed ? "px-2" : "px-5"
        }`}
      >
        {isCollapsed ? (
          <Link
            href="/"
            title="XKitchen ライセンス営業 CRM"
            className="flex justify-center"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700">
              <Image
                src="/brand/mark-white.svg"
                alt="XKitchen"
                width={38}
                height={36}
                priority
                unoptimized
                className="h-5 w-5"
              />
            </span>
          </Link>
        ) : (
          <>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-700">
                <Image
                  src="/brand/mark-white.svg"
                  alt=""
                  width={38}
                  height={36}
                  priority
                  unoptimized
                  className="h-5 w-5"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-tight text-white">
                  X Kitchen
                </span>
                <span className="block text-[11px] leading-tight text-brand-200/80">
                  ライセンス営業 CRM
                </span>
              </span>
            </Link>
          </>
        )}
      </div>

      <Nav onNavigate={() => setOpen(false)} collapsed={isCollapsed} />

      <div
        className={`border-t border-brand-700 py-3 ${
          isCollapsed ? "px-2" : "px-5"
        }`}
      >
        {isCollapsed ? (
          <form action="/auth/signout" method="post" className="flex justify-center">
            <button
              type="submit"
              title={`${email} / ログアウト`}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-200/80 transition-colors hover:bg-brand-700 hover:text-white"
            >
              <span className="sr-only">ログアウト</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-5 w-5"
              >
                <path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M18.75 15 21.75 12m0 0-3-3m3 3H9" />
              </svg>
            </button>
          </form>
        ) : (
          <>
            <p className="truncate text-[11px] text-brand-200/80" title={email}>
              {email}
            </p>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="mt-1.5 text-[11px] text-brand-200/80 underline underline-offset-2 transition-colors hover:text-white"
              >
                ログアウト
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );

  return (
    // dvh = モバイルのアドレスバー可変高で下端が隠れるのを防ぐ
    <div className="flex h-[100dvh] overflow-hidden">
      {/* 広い画面の固定サイドバー。« で折りたたむと本文を広く使える */}
      <aside
        className={`relative hidden shrink-0 flex-col bg-brand-800 transition-[width] lg:flex ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {renderSidebar(collapsed)}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          title={collapsed ? "サイドバーを広げる" : "サイドバーを折りたたむ"}
          className="absolute right-0 top-4 flex h-7 w-6 items-center justify-center rounded-l-md bg-brand-600 text-brand-100 transition-colors hover:bg-brand-500 hover:text-white"
        >
          <span className="sr-only">
            {collapsed ? "サイドバーを広げる" : "サイドバーを折りたたむ"}
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-3.5 w-3.5"
          >
            {collapsed ? (
              <path d="M9 6l6 6-6 6" />
            ) : (
              <path d="M15 6l-6 6 6 6" />
            )}
          </svg>
        </button>
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
            className="absolute inset-y-0 left-0 flex w-64 max-w-[85%] flex-col bg-brand-800 shadow-pop"
          >
            {renderSidebar(false)}
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
