import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createMeeting } from "../actions";
import { MEETING_FORMAT, SCENE_TAG, type Company, type Deal } from "@/lib/types";

const field =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const labelCls = "block text-sm font-medium text-slate-700";

type DealOption = Pick<Deal, "id" | "title"> & {
  companies: Pick<Company, "name"> | null;
};

// 実施日の初期値（JST基準の今日）。DB側はdefault current_dateを持たないため明示送信する。
function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const PROBLEM_ROWS = [1, 2, 3] as const;

export default async function NewMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{
    deal_id?: string | string[];
    company_id?: string | string[];
  }>;
}) {
  const { deal_id, company_id } = await searchParams;
  const presetDealId = typeof deal_id === "string" ? deal_id : "";
  const presetCompanyId = typeof company_id === "string" ? company_id : "";

  const supabase = await createClient();
  const [{ data: companyData }, { data: dealData }] = await Promise.all([
    supabase.from("companies").select("id, name").order("name", { ascending: true }),
    supabase
      .from("deals")
      .select("*, companies ( name )")
      .order("created_at", { ascending: false }),
  ]);
  const companies = (companyData ?? []) as Pick<Company, "id" | "name">[];
  const deals = (dealData ?? []) as DealOption[];

  return (
    <div className="px-8 py-10">
      <div className="mb-6">
        <Link href="/meetings" className="text-sm text-slate-500 hover:text-slate-900">
          ← MTG一覧
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">MTGを記録</h1>
      </div>

      <form
        action={createMeeting}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div>
          <label htmlFor="title" className={labelCls}>
            MTGタイトル <span className="text-red-500">*</span>
          </label>
          <input id="title" name="title" required className={field} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="format" className={labelCls}>
              区分 <span className="text-red-500">*</span>
            </label>
            <select id="format" name="format" required defaultValue="" className={field}>
              <option value="">（選択してください）</option>
              {Object.entries(MEETING_FORMAT).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="held_on" className={labelCls}>
              実施日 <span className="text-red-500">*</span>
            </label>
            <input
              id="held_on"
              name="held_on"
              type="date"
              required
              defaultValue={todayJst()}
              className={field}
            />
          </div>
        </div>

        <div>
          <label htmlFor="deal_id" className={labelCls}>
            関連する案件 <span className="font-normal text-slate-400">任意</span>
          </label>
          <select
            id="deal_id"
            name="deal_id"
            defaultValue={presetDealId}
            className={field}
          >
            <option value="">（なし）</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.companies?.name ? `${d.companies.name} / ${d.title}` : d.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="company_id" className={labelCls}>
            関連する取引先 <span className="font-normal text-slate-400">任意</span>
          </label>
          <select
            id="company_id"
            name="company_id"
            defaultValue={presetCompanyId}
            className={field}
          >
            <option value="">（なし）</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="attendees" className={labelCls}>
            参加者
          </label>
          <input id="attendees" name="attendees" className={field} />
        </div>

        <div>
          <label htmlFor="summary" className={labelCls}>
            要旨
          </label>
          <textarea id="summary" name="summary" rows={4} className={field} />
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-5">
          <div>
            <p className="text-sm font-medium text-slate-700">
              困りごと <span className="font-normal text-slate-400">任意・最大3件</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              入力すると山路確認キューへ自動登録されます。
            </p>
          </div>
          {PROBLEM_ROWS.map((i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-[160px_1fr]">
              <div>
                <label htmlFor={`scene_tag_${i}`} className={labelCls}>
                  場面タグ
                </label>
                <select
                  id={`scene_tag_${i}`}
                  name={`scene_tag_${i}`}
                  defaultValue=""
                  className={field}
                >
                  <option value="">（未選択）</option>
                  {Object.entries(SCENE_TAG).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`problem_${i}`} className={labelCls}>
                  内容
                </label>
                <input id={`problem_${i}`} name={`problem_${i}`} className={field} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-800"
          >
            登録する
          </button>
          <Link href="/meetings" className="text-sm text-slate-500 hover:text-slate-900">
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
