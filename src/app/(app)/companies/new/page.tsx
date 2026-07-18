import Link from "next/link";
import { createCompany } from "../actions";
import { COMPANY_SIZE, COMPANY_STATUS } from "@/lib/types";

const field =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const labelCls = "block text-sm font-medium text-slate-700";

export default function NewCompanyPage() {
  return (
    <div className="px-8 py-10">
      <div className="mb-6">
        <Link href="/companies" className="text-sm text-slate-500 hover:text-slate-900">
          ← 取引先一覧
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">取引先を新規登録</h1>
      </div>

      <form
        action={createCompany}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div>
          <label htmlFor="name" className={labelCls}>
            会社名 <span className="text-red-500">*</span>
          </label>
          <input id="name" name="name" required className={field} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name_kana" className={labelCls}>
              会社名（かな）
            </label>
            <input id="name_kana" name="name_kana" className={field} />
          </div>
          <div>
            <label htmlFor="status" className={labelCls}>
              ステータス
            </label>
            <select id="status" name="status" defaultValue="prospect" className={field}>
              {Object.entries(COMPANY_STATUS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="company_size" className={labelCls}>
              企業規模{" "}
              <span className="font-normal text-slate-400">
                目安: 10店舗以上・従業員100名以上・上場系は大手
              </span>
            </label>
            <select
              id="company_size"
              name="company_size"
              defaultValue=""
              className={field}
            >
              <option value="">（未設定）</option>
              {Object.entries(COMPANY_SIZE).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="industry" className={labelCls}>
              業種
            </label>
            <input id="industry" name="industry" className={field} />
          </div>
          <div>
            <label htmlFor="phone" className={labelCls}>
              電話番号
            </label>
            <input id="phone" name="phone" className={field} />
          </div>
        </div>

        <div>
          <label htmlFor="website" className={labelCls}>
            Web サイト
          </label>
          <input id="website" name="website" placeholder="https://" className={field} />
        </div>

        <div>
          <label htmlFor="address" className={labelCls}>
            住所
          </label>
          <input id="address" name="address" className={field} />
        </div>

        <div>
          <label htmlFor="note" className={labelCls}>
            メモ
          </label>
          <textarea id="note" name="note" rows={3} className={field} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-800"
          >
            登録する
          </button>
          <Link
            href="/companies"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
