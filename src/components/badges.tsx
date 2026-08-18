// バッジ配色の単一ソース（各ページに重複定義しない）
//
// 配色の規律（SEKAI STAY Visual Guide 準拠・アクセントは XKitchen Navy）:
//   中立・未着手  → 中立トークン（surface / line / ink-soft）
//   進行中・分類  → brand（ブランドNavyのティント）
//   完了・獲得    → emerald
//   要対応・保留  → amber
//   失注・危険    → rose
// 明るい面＋濃い文字で統一し、可読性を最優先する。色は「意味」に対応させ、
// 種類の数だけ色を増やさない（色数を絞ることが読みやすさに直結する）。

export const TASK_STATUS_STYLE: Record<string, string> = {
  todo: "bg-surface text-ink-soft",
  doing: "bg-brand-100 text-brand-800",
  done: "bg-emerald-50 text-emerald-700",
};

export const TASK_PRIORITY_STYLE: Record<string, string> = {
  low: "text-ink-faint",
  medium: "text-ink-soft",
  high: "text-rose-600",
};

export const COMPANY_STATUS_STYLE: Record<string, string> = {
  prospect: "bg-surface text-ink-soft",
  negotiating: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  lost: "bg-rose-50 text-rose-700",
};

// 場面タグ: PB品まわりが業務の主役なのでブランド色を当て、金額系は amber、他は中立
export const SCENE_TAG_STYLE: Record<string, string> = {
  pb_product: "bg-brand-100 text-brand-800",
  maker_intro: "bg-brand-50 text-brand-700",
  pricing: "bg-amber-50 text-amber-700",
  contract_doc: "bg-line text-ink",
  other: "bg-surface text-ink-faint",
};

// MTGの区分: オンラインが主戦場なのでブランド色、オフラインは中立。
// （以前は blue-100 を meetings/page.tsx に直接持っていたが、他のバッジと色系統が
//   ずれて「青だけ意味が違う」状態になっていたため brand/neutral へ寄せて集約した）
export const MEETING_FORMAT_STYLE: Record<string, string> = {
  online: "bg-brand-100 text-brand-800",
  offline: "bg-surface text-ink-soft",
};

export const KNOWLEDGE_STATUS_STYLE: Record<string, string> = {
  open: "bg-surface text-ink-soft",
  review_requested: "bg-amber-50 text-amber-700",
  answered: "bg-brand-100 text-brand-800",
  published: "bg-emerald-50 text-emerald-700",
};

export const PARTNER_TYPE_STYLE: Record<string, string> = {
  maker: "bg-brand-100 text-brand-800",
  wholesaler: "bg-brand-50 text-brand-700",
  company: "bg-surface text-ink-soft",
  customer: "bg-emerald-50 text-emerald-700",
};

// 紹介の方向: 紹介された（受け取り）=獲得系の emerald、紹介した=ブランド色
export const REFERRAL_DIRECTION_STYLE: Record<string, string> = {
  received: "bg-emerald-50 text-emerald-700",
  given: "bg-brand-50 text-brand-700",
};

// 決裁権の強弱（決裁者を最も強く見せる）
export const DECISION_ROLE_STYLE: Record<string, string> = {
  decision_maker: "bg-brand-700 text-white",
  influencer: "bg-brand-100 text-brand-800",
  gatekeeper: "bg-surface text-ink-faint",
};
