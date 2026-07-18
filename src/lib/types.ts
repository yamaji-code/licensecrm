// DB エンティティの型定義（supabase/migrations/ の SQL と対応）

export const COMPANY_STATUS = {
  prospect: "見込み",
  negotiating: "商談中",
  active: "契約",
  lost: "失注",
} as const;
export type CompanyStatus = keyof typeof COMPANY_STATUS;

// 案件ステージ（0004 で実業務フローに全面再定義）
// 実フロー: スクレイピング→急成長抽出→週1選定→案件化→商談→契約→ブランド化→SV案内可能(ゴール)
// スクレイピング〜抽出は案件前工程のためボード外。sourced = 抽出済みで投入された状態。
// meeting_done / contract は KPI 計上点のためキー名を旧体系から維持している（ラベルのみ運用語）。
export const DEAL_STAGE = {
  sourced: "候補（抽出済）",
  picked: "今週のアプローチ先",
  approaching: "アプローチ中",
  meeting_set: "商談設定",
  meeting_done: "商談実施",
  negotiating: "条件調整",
  contract: "契約",
  branding: "ブランド化",
  sv_ready: "SV案内可能",
  nurturing: "時期見送り",
  lost: "失注",
} as const;
export type DealStage = keyof typeof DEAL_STAGE;

// 各ステージの入場条件（列ヘッダの説明・確認ラリー削減のための明文化）
export const DEAL_STAGE_ENTRY: Record<DealStage, string> = {
  sourced: "急成長アカウントとして抽出済み・山路さん未判断",
  picked: "山路さんが今週アプローチすると選定。石田さんはここから着手",
  approaching: "初回コンタクトに着手した",
  meeting_set: "商談の日程が確定した",
  meeting_done: "商談を実施した（商談KPIに自動計上）",
  negotiating: "提案済み・条件と意思決定の詰め",
  contract: "契約を締結した（契約KPIに自動計上）",
  branding: "PB品確認・代替品探索・ブランド共創・原価/マニュアル整備中",
  sv_ready: "SVが加盟店に案内できる状態（ゴール）",
  nurturing: "時期見送り。再アプローチ予定日を決めて待つ",
  lost: "失注",
};

// パイプラインの進行順（nurturing / lost は進行外のため含めない）
export const DEAL_STAGE_ORDER: readonly DealStage[] = [
  "sourced",
  "picked",
  "approaching",
  "meeting_set",
  "meeting_done",
  "negotiating",
  "contract",
  "branding",
  "sv_ready",
];

// 進行が終了しているステージ（オープン案件の絞り込みに使う）
export const CLOSED_DEAL_STAGES: readonly DealStage[] = [
  "sv_ready",
  "nurturing",
  "lost",
];

// ボードの列グループ帯（フェーズの塊を示す視覚ラベルの単一ソース）
export const STAGE_GROUPS: readonly {
  key: string;
  label: string;
  stages: readonly DealStage[];
}[] = [
  { key: "lead", label: "リード", stages: ["sourced", "picked"] },
  {
    key: "sales",
    label: "営業",
    stages: ["approaching", "meeting_set", "meeting_done", "negotiating"],
  },
  {
    key: "brand",
    label: "契約・ブランド化",
    stages: ["contract", "branding", "sv_ready"],
  },
  { key: "inactive", label: "進行外", stages: ["nurturing", "lost"] },
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

// 見送り・失注のフェーズ（旧CRM実データで「提案前NG」「提案後NG」の2種を確認済み）
export const LOST_REASON_PHASE = {
  before_proposal: "提案前",
  after_proposal: "提案後",
  other: "その他",
} as const;
export type LostReasonPhase = keyof typeof LOST_REASON_PHASE;

// 企業規模（決裁リードタイムの規模別計測用。null = 未設定）
export const COMPANY_SIZE = {
  large: "大手",
  sme: "中小",
} as const;
export type CompanySize = keyof typeof COMPANY_SIZE;

// PB品の状態（null = 未確認）
export const PB_STATUS = {
  has_pb: "PB品あり",
  searching: "代替品探索中",
  co_creating: "ブランド共創中",
  not_needed: "PB品不要",
} as const;
export type PbStatus = keyof typeof PB_STATUS;

// 部署（タスク雛形の担当部署。旧Notion 16ステップ雛形の区分に対応）
export const DEPARTMENT = {
  sales: "営業",
  biz_dev: "業態開発",
  management: "経営",
  cs: "CS",
} as const;
export type Department = keyof typeof DEPARTMENT;

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
  company_size: CompanySize | null;
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
  template_id: string | null;
  department: Department | null;
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
  genre_id: string | null;
  pb_status: PbStatus | null;
  migrated_from_legacy: boolean;
  note: string | null;
  lost_reason_phase: LostReasonPhase | null;
  lost_reason_note: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Genre = {
  id: string;
  name: string;
  name_kana: string | null;
  priority_override: "boost" | "suppress" | null;
  is_active: boolean;
  sort_order: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type StageTaskTemplate = {
  id: string;
  stage: DealStage;
  title: string;
  department: Department;
  is_required: boolean;
  due_offset_days: number;
  sort_order: number;
  is_active: boolean;
  note: string | null;
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
  genre_id: string | null;
  migrated_from_legacy: boolean;
  company_size: CompanySize | null;
};

// stage_durations ビューの行（各案件×各ステージの滞在日数）
export type StageDuration = {
  deal_id: string;
  company_id: string;
  company_size: CompanySize | null;
  genre_id: string | null;
  migrated_from_legacy: boolean;
  stage: DealStage;
  entered_at: string;
  exited_at: string | null;
  days_in_stage: number;
  is_current: boolean;
  is_first_event: boolean;
};

// genre_stats ビューの行（ジャンル別の契約/進行中件数）
export type GenreStat = {
  genre_id: string;
  name: string;
  priority_override: "boost" | "suppress" | null;
  is_active: boolean;
  sort_order: number;
  contracted_count: number;
  open_count: number;
};
