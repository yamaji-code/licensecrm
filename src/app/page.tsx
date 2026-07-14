import Link from "next/link";

const MODULES = [
  {
    href: "/crm",
    title: "取引先・顧客",
    description: "取引先と担当者を一覧・登録・編集する CRM",
    ready: false,
  },
  {
    href: "/tasks",
    title: "タスク管理",
    description: "タスクの状況・期限・担当を管理する",
    ready: false,
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold text-slate-900">License CRM</h1>
        <p className="mt-1 text-sm text-slate-500">
          社内向け 業務効率化ダッシュボード
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {MODULES.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-400 hover:shadow"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-slate-900">{m.title}</h2>
              {!m.ready && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  準備中
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-500">{m.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
