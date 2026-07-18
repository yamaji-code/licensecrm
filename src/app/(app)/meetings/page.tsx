import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MEETING_FORMAT, type Company, type Deal, type Meeting } from "@/lib/types";

const FORMAT_STYLE: Record<string, string> = {
  online: "bg-blue-100 text-blue-700",
  offline: "bg-emerald-100 text-emerald-700",
};

type MeetingRow = Meeting & {
  deals: Pick<Deal, "title"> | null;
  companies: Pick<Company, "name"> | null;
};

export default async function MeetingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*, deals ( title ), companies ( name )")
    .order("held_on", { ascending: false });

  const meetings = (data ?? []) as MeetingRow[];

  return (
    <div className="px-8 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">MTG</h1>
          <p className="mt-1 text-sm text-slate-500">{meetings.length} 件</p>
        </div>
        <Link
          href="/meetings/new"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-800"
        >
          + MTGを記録
        </Link>
      </header>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          読み込みエラー: {error.message}（マイグレーション未実行の可能性があります）
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {meetings.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-5 py-3 font-medium">実施日</th>
                <th className="px-5 py-3 font-medium">タイトル</th>
                <th className="px-5 py-3 font-medium">区分</th>
                <th className="px-5 py-3 font-medium">関連</th>
                <th className="px-5 py-3 font-medium">要旨</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {meetings.map((m) => (
                <tr key={m.id} className="transition hover:bg-slate-50">
                  <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                    {m.held_on}
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{m.title}</p>
                    {m.attendees && (
                      <p className="text-xs text-slate-400">{m.attendees}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        FORMAT_STYLE[m.format]
                      }`}
                    >
                      {MEETING_FORMAT[m.format]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {m.deal_id ? (
                      <Link href={`/deals/${m.deal_id}`} className="hover:underline">
                        {m.deals?.title ?? "案件"}
                      </Link>
                    ) : m.company_id ? (
                      <Link
                        href={`/companies/${m.company_id}`}
                        className="hover:underline"
                      >
                        {m.companies?.name ?? "取引先"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-xs truncate px-5 py-3 text-slate-600">
                    {m.summary ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            まだMTGが登録されていません。「MTGを記録」から登録してください。
          </p>
        )}
      </div>
    </div>
  );
}
