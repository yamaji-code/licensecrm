import type { Company, Deal, Task, TaskAssignee } from "@/lib/types";

// 担当者アイコン用の顔写真（public/avatars/）。担当者は固定2名のためハードコードでよい。
// ファイル名に -v2 を付けているのは、差し替え後もブラウザ/CDNのキャッシュで古い画像が
// 残ってしまう問題を避けるため（同じファイル名だとキャッシュが更新されないことがある）。
export const TASK_ASSIGNEE_AVATAR: Record<TaskAssignee, string> = {
  ishida: "/avatars/ishida-v2.jpg",
  yamaji: "/avatars/yamaji-v2.jpg",
};

export type DealOption = Pick<Deal, "id" | "title"> & {
  companies: Pick<Company, "name"> | null;
};

// タスクは company_id を直接持たないことが多い（案件のnext actionはdeal_idだけで
// 作られるため）。表示する取引先名は、直接の company_id が無ければ紐づく案件の
// 取引先で補う。
export type TaskWithCompany = Task & {
  companies: { name: string } | null;
  deals: { companies: { name: string } | null } | null;
};

export const TASK_WITH_COMPANY_SELECT =
  "*, companies ( name ), deals ( companies ( name ) )";

export function companyNameOf(task: TaskWithCompany): string | null {
  return task.companies?.name ?? task.deals?.companies?.name ?? null;
}
