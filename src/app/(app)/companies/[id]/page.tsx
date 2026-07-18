import Link from "next/link";
import { STAGE_BADGE_STYLE } from "@/components/stage-badge";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateCompanySize } from "../actions";
import {
  COMPANY_SIZE,
  COMPANY_STATUS,
  CONTACT_DECISION_ROLE,
  CONTACT_DECISION_ROLE_MARK,
  CONTACT_LEAD_TIME,
  DEAL_CHANNEL,
  DEAL_STAGE,
  type Company,
  type Contact,
  type Deal,
} from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  prospect: "bg-slate-100 text-slate-600",
  negotiating: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-600",
};

// 決裁権バッジの強弱（決裁者を最も強く見せる）
const DECISION_ROLE_STYLE: Record<string, string> = {
  decision_maker: "bg-slate-900 text-white",
  influencer: "bg-slate-200 text-slate-700",
  gatekeeper: "bg-slate-100 text-slate-500",
};

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const [
    { data: companyData, error: companyError },
    { data: contactData },
    { data: dealData },
  ] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("contacts")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("deals")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (companyError || !companyData) {
    notFound();
  }

  const company = companyData as Company;
  const contacts = (contactData ?? []) as Contact[];
  const deals = (dealData ?? []) as Deal[];

  return (
    <div className="px-8 py-10">
      <div className="mb-6">
        <Link href="/companies" className="text-sm text-slate-500 hover:text-slate-900">
          ← 取引先一覧
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{company.name}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[company.status]}`}
          >
            {COMPANY_STATUS[company.status]}
          </span>
        </div>
        {company.name_kana && (
          <p className="mt-1 text-sm text-slate-400">{company.name_kana}</p>
        )}
      </div>

      {/* 会社基本情報 */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-medium text-slate-500">基本情報</h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">
              企業規模{" "}
              <span className="text-slate-300">
                （目安: 10店舗以上・従業員100名以上・上場系は大手）
              </span>
            </dt>
            <dd className="mt-0.5">
              <form
                action={updateCompanySize}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="id" value={company.id} />
                <select
                  name="company_size"
                  defaultValue={company.company_size ?? ""}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-900 outline-none focus:border-slate-500"
                >
                  <option value="">未設定</option>
                  {Object.entries(COMPANY_SIZE).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  保存
                </button>
              </form>
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">業種</dt>
            <dd className="mt-0.5 text-slate-900">{company.industry ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">電話番号</dt>
            <dd className="mt-0.5 text-slate-900">{company.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Web サイト</dt>
            <dd className="mt-0.5 text-slate-900">{company.website ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">住所</dt>
            <dd className="mt-0.5 text-slate-900">{company.address ?? "—"}</dd>
          </div>
        </dl>
        {company.note && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <dt className="text-sm text-slate-400">メモ</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
              {company.note}
            </dd>
          </div>
        )}
      </section>

      {/* 担当者一覧（人物情報カード） */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-500">担当者 {contacts.length} 名</h2>
          <Link
            href={`/companies/${company.id}/contacts/new`}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
          >
            + 担当者を追加
          </Link>
        </div>

        {contacts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {contacts.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold text-slate-900">{c.name}</p>
                      {c.decision_role && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${DECISION_ROLE_STYLE[c.decision_role]}`}
                        >
                          {CONTACT_DECISION_ROLE_MARK[c.decision_role]}{" "}
                          {CONTACT_DECISION_ROLE[c.decision_role]}
                        </span>
                      )}
                    </div>
                    {c.title && <p className="text-xs text-slate-400">{c.title}</p>}
                  </div>
                  <Link
                    href={`/companies/${company.id}/contacts/${c.id}/edit`}
                    className="whitespace-nowrap text-xs text-slate-500 hover:text-slate-900 hover:underline"
                  >
                    編集
                  </Link>
                </div>

                {/* 人柄・連絡NG時間帯は最上位・太字で表示（商談前の必読情報） */}
                {(c.personality || c.contact_ng_hours) && (
                  <div className="mt-3 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    {c.personality && (
                      <p className="font-semibold text-slate-900">人柄: {c.personality}</p>
                    )}
                    {c.contact_ng_hours && (
                      <p className="font-semibold text-red-600">
                        連絡NG: {c.contact_ng_hours}
                      </p>
                    )}
                  </div>
                )}

                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-slate-400">想定リードタイム</dt>
                    <dd className="text-slate-700">
                      {c.lead_time ? CONTACT_LEAD_TIME[c.lead_time] : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">メール</dt>
                    <dd className="text-slate-700">{c.email ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">電話</dt>
                    <dd className="text-slate-700">{c.phone ?? "—"}</dd>
                  </div>
                </dl>

                {c.note && <p className="mt-3 text-xs text-slate-500">{c.note}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">
            まだ担当者が登録されていません。「担当者を追加」から登録してください。
          </p>
        )}
      </section>

      {/* この会社に紐づく案件一覧 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-500">案件 {deals.length} 件</h2>
          <Link
            href={`/deals/new?company_id=${company.id}`}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          >
            + 案件を追加
          </Link>
        </div>

        {deals.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {deals.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <Link
                  href={`/deals/${d.id}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {d.title}
                </Link>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_BADGE_STYLE[d.stage]}`}
                  >
                    {DEAL_STAGE[d.stage]}
                  </span>
                  <span className="text-xs text-slate-400">{DEAL_CHANNEL[d.channel]}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">
            まだ案件がありません。「案件を追加」から登録してください。
          </p>
        )}
      </section>
    </div>
  );
}
