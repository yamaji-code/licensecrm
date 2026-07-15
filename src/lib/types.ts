// DB エンティティの型定義（supabase/migrations/ の SQL と対応）

export const COMPANY_STATUS = {
  prospect: "見込み",
  negotiating: "商談中",
  active: "契約",
  lost: "失注",
} as const;
export type CompanyStatus = keyof typeof COMPANY_STATUS;

export const DEAL_STAGE = {
  list: "リスト",
  selected: "選定済",
  contacting: "コンタクト中",
  meeting_set: "商談設定",
  meeting_done: "商談実施",
  considering: "検討・条件調整",
  contract: "契約",
  live: "稼働",
  nurturing: "ナーチャリング",
  lost: "失注",
} as const;
export type DealStage = keyof typeof DEAL_STAGE;

// パイプラインの進行順（nurturing / lost は進行外のため含めない）
export const DEAL_STAGE_ORDER: readonly DealStage[] = [
  "list",
  "selected",
  "contacting",
  "meeting_set",
  "meeting_done",
  "considering",
  "contract",
  "live",
];

// 進行が終了しているステージ（オープン案件の絞り込みに使う）
export const CLOSED_DEAL_STAGES: readonly DealStage[] = [
  "live",
  "nurturing",
  "lost",
];

export const DEAL_CHANNEL = {
  referral_customer: "顧客紹介",
  referral_alliance: "アライアンス紹介",
  direct_list: "ダイレクト（リスト）",
  inbound: "インバウンド",
  other: "その他",
} as const;
export type DealChannel = keyof typeof DEAL_CHANNEL;

// 紹介系チャネル（案件作成時に referrals へ「紹介された」記録を残す対象）
export const REFERRAL_CHANNELS: readonly DealChannel[] = [
  "referral_customer",
  "referral_alliance",
];

export const PARTNER_TYPE = {
  maker: "メーカー",
  wholesaler: "卸",
  company: "他企業",
  customer: "既存顧客",
} as const;
export type PartnerType = keyof typeof PARTNER_TYPE;

export const REFERRAL_DIRECTION = {
  received: "紹介された",
  given: "紹介した",
} as const;
export type ReferralDirection = keyof typeof REFERRAL_DIRECTION;

export const MEETING_FORMAT = {
  online: "オンライン",
  offline: "オフライン",
} as const;
export type MeetingFormat = keyof typeof MEETING_FORMAT;

export const SCENE_TAG = {
  pb_product: "PB品",
  maker_intro: "メーカー紹介",
  pricing: "価格",
  contract_doc: "契約書",
  other: "その他",
} as const;
export type SceneTag = keyof typeof SCENE_TAG;

export const KNOWLEDGE_STATUS = {
  open: "未解決",
  review_requested: "確認依頼中",
  answered: "回答済み",
  published: "ナレッジ公開",
} as const;
export type KnowledgeStatus = keyof typeof KNOWLEDGE_STATUS;

export const CONTACT_DECISION_ROLE = {
  decision_maker: "決裁者",
  influencer: "影響者",
  gatekeeper: "窓口",
} as const;
export type ContactDecisionRole = keyof typeof CONTACT_DECISION_ROLE;

// 一覧などで短く出すときの記号表記
export const CONTACT_DECISION_ROLE_MARK = {
  decision_maker: "◎",
  influencer: "○",
  gatekeeper: "△",
} as const;

export const CONTACT_LEAD_TIME = {
  immediate: "即断",
  one_month: "1ヶ月",
  three_months_plus: "3ヶ月以上",
} as const;
export type ContactLeadTime = keyof typeof CONTACT_LEAD_TIME;

export const TASK_STATUS = {
  todo: "未着手",
  doing: "対応中",
  done: "完了",
} as const;
export type TaskStatus = keyof typeof TASK_STATUS;

export const TASK_PRIORITY = {
  low: "低",
  medium: "中",
  high: "高",
} as const;
export type TaskPriority = keyof typeof TASK_PRIORITY;

export type Company = {
  id: string;
  name: string;
  name_kana: string | null;
  status: CompanyStatus;
  industry: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  note: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  company_id: string | null;
  name: string;
  name_kana: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  decision_role: ContactDecisionRole | null;
  personality: string | null;
  lead_time: ContactLeadTime | null;
  contact_ng_hours: string | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  company_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  assignee_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type Partner = {
  id: string;
  name: string;
  name_kana: string | null;
  partner_type: PartnerType;
  company_id: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Deal = {
  id: string;
  company_id: string;
  title: string;
  stage: DealStage;
  channel: DealChannel;
  partner_id: string | null;
  note: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type StageEvent = {
  id: string;
  deal_id: string;
  from_stage: DealStage | null;
  to_stage: DealStage;
  changed_by: string | null;
  changed_at: string;
};

export type Referral = {
  id: string;
  partner_id: string;
  direction: ReferralDirection;
  deal_id: string | null;
  company_id: string | null;
  note: string | null;
  occurred_on: string;
  created_at: string;
  updated_at: string;
};

export type Meeting = {
  id: string;
  title: string;
  format: MeetingFormat;
  held_on: string;
  deal_id: string | null;
  company_id: string | null;
  attendees: string | null;
  summary: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type KnowledgeCard = {
  id: string;
  scene_tag: SceneTag;
  problem: string;
  solution: string | null;
  status: KnowledgeStatus;
  meeting_id: string | null;
  deal_id: string | null;
  company_id: string | null;
  requested_by: string | null;
  answered_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

// deal_kpi_facts ビューの行（商談実施 / 契約への初回到達時刻）
export type DealKpiFact = {
  deal_id: string;
  company_id: string;
  channel: DealChannel;
  partner_id: string | null;
  stage: DealStage;
  created_at: string;
  first_meeting_at: string | null;
  first_contract_at: string | null;
};
