import type { Company, Deal, Task } from "@/lib/types";

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
