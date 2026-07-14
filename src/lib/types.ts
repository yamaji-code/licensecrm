// DB エンティティの型定義（supabase/migrations/0001_init.sql と対応）

export const COMPANY_STATUS = {
  prospect: "見込み",
  negotiating: "商談中",
  active: "契約",
  lost: "失注",
} as const;
export type CompanyStatus = keyof typeof COMPANY_STATUS;

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
  assignee_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};
