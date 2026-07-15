import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateContact } from "../../../../actions";
import {
  CONTACT_DECISION_ROLE,
  CONTACT_LEAD_TIME,
  type Company,
  type Contact,
} from "@/lib/types";

const field =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500";
const labelCls = "block text-sm font-medium text-slate-700";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string; contactId: string }>;
}) {
  const { id, contactId } = await params;

  const supabase = await createClient();
  const [{ data: companyData, error: companyError }, { data: contactData, error: contactError }] =
    await Promise.all([
      supabase.from("companies").select("id, name").eq("id", id).maybeSingle(),
      supabase.from("contacts").select("*").eq("id", contactId).maybeSingle(),
    ]);

  // 会社が存在しない、担当者が存在しない、または担当者が別会社に紐づく場合は404
  if (
    companyError ||
    !companyData ||
    contactError ||
    !contactData ||
    (contactData as Contact).company_id !== id
  ) {
    notFound();
  }

  const company = companyData as Pick<Company, "id" | "name">;
  const contact = contactData as Contact;

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <div className="mb-6">
        <Link
          href={`/companies/${company.id}`}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← {company.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">担当者を編集</h1>
      </div>

      <form
        action={updateContact}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <input type="hidden" name="id" value={contact.id} />
        <input type="hidden" name="company_id" value={company.id} />

        <div>
          <label htmlFor="name" className={labelCls}>
            氏名 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={contact.name}
            className={field}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name_kana" className={labelCls}>
              氏名（かな）
            </label>
            <input
              id="name_kana"
              name="name_kana"
              defaultValue={contact.name_kana ?? ""}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="title" className={labelCls}>
              役職
            </label>
            <input
              id="title"
              name="title"
              defaultValue={contact.title ?? ""}
              className={field}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className={labelCls}>
              メール
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={contact.email ?? ""}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="phone" className={labelCls}>
              電話番号
            </label>
            <input
              id="phone"
              name="phone"
              defaultValue={contact.phone ?? ""}
              className={field}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="decision_role" className={labelCls}>
              決裁権区分
            </label>
            <select
              id="decision_role"
              name="decision_role"
              defaultValue={contact.decision_role ?? ""}
              className={field}
            >
              <option value="">（未設定）</option>
              {Object.entries(CONTACT_DECISION_ROLE).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lead_time" className={labelCls}>
              想定リードタイム
            </label>
            <select
              id="lead_time"
              name="lead_time"
              defaultValue={contact.lead_time ?? ""}
              className={field}
            >
              <option value="">（未設定）</option>
              {Object.entries(CONTACT_LEAD_TIME).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="personality" className={labelCls}>
            人柄（1行）
          </label>
          <input
            id="personality"
            name="personality"
            defaultValue={contact.personality ?? ""}
            placeholder="例: 論理的で即決タイプ、価格に厳しい"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="contact_ng_hours" className={labelCls}>
            連絡NG時間帯
          </label>
          <input
            id="contact_ng_hours"
            name="contact_ng_hours"
            defaultValue={contact.contact_ng_hours ?? ""}
            placeholder="例: 平日午前中は会議で不可"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="note" className={labelCls}>
            メモ
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            defaultValue={contact.note ?? ""}
            className={field}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            更新する
          </button>
          <Link
            href={`/companies/${company.id}`}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
