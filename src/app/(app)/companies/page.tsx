import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COMPANY_SIZE, COMPANY_STATUS, type Company } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  prospect: "bg-slate-100 text-slate-600",
  negotiating: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-600",
};

export default async function CompaniesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  const companies = (data ?? []) as Company[];

  return (
    <div className="px-8 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">取引先・顧客</h1>
          <p className="mt-1 text-sm text-slate-500">{companies.length} 社</p>
        </div>
        <Link
          href="/companies/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          + 新規登録
        </Link>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          読み込みエラー: {error.message}（マイグレーション未実行の可能性があります）
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {companies.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-5 py-3 font-medium">会社名</th>
                <th className="px-5 py-3 font-medium">ステータス</th>
                <th className="px-5 py-3 font-medium">規模</th>
                <th className="px-5 py-3 font-medium">業種</th>
                <th className="px-5 py-3 font-medium">電話</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((c) => (
                <tr key={c.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/companies/${c.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {c.name}
                    </Link>
                    {c.name_kana && (
                      <p className="text-xs text-slate-400">{c.name_kana}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLE[c.status]
                      }`}
                    >
                      {COMPANY_STATUS[c.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {c.company_size ? COMPANY_SIZE[c.company_size] : "未設定"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{c.industry ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{c.phone ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            まだ取引先が登録されていません。「新規登録」から追加してください。
          </p>
        )}
      </div>
    </div>
  );
}
