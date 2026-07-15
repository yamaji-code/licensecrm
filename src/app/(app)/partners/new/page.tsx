import Link from "next/link";
import { createPartner } from "../actions";
import { PARTNER_TYPE } from "@/lib/types";

const field =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500";
const labelCls = "block text-sm font-medium text-slate-700";

export default function NewPartnerPage() {
  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <div className="mb-6">
        <Link href="/partners" className="text-sm text-slate-500 hover:text-slate-900">
          ← パートナー一覧
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">パートナーを新規登録</h1>
      </div>

      <form
        action={createPartner}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div>
          <label htmlFor="name" className={labelCls}>
            パートナー名 <span className="text-red-500">*</span>
          </label>
          <input id="name" name="name" required className={field} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name_kana" className={labelCls}>
              パートナー名（かな）
            </label>
            <input id="name_kana" name="name_kana" className={field} />
          </div>
          <div>
            <label htmlFor="partner_type" className={labelCls}>
              種別
            </label>
            <select id="partner_type" name="partner_type" defaultValue="company" className={field}>
              {Object.entries(PARTNER_TYPE).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contact_name" className={labelCls}>
              窓口担当者名
            </label>
            <input id="contact_name" name="contact_name" className={field} />
          </div>
          <div>
            <label htmlFor="phone" className={labelCls}>
              電話番号
            </label>
            <input id="phone" name="phone" className={field} />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={labelCls}>
            メール
          </label>
          <input id="email" name="email" type="email" className={field} />
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
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            登録する
          </button>
          <Link href="/partners" className="text-sm text-slate-500 hover:text-slate-900">
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
