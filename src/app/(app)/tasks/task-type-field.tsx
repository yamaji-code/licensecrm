"use client";

import { useState } from "react";
import { Field, Select } from "@/components/ui";
import type { Company, Deal } from "@/lib/types";

type DealOption = Pick<Deal, "id" | "title"> & {
  companies: Pick<Company, "name"> | null;
};

/**
 * タスク種別（next action=案件に紐づくタスク／other task=それ以外）を選ぶ。
 * 種別そのものはDBに列を持たず、内部的には deal_id の有無で表現する
 * （next actionを選んだ時だけ関連する案件の選択を必須で表示する）。
 */
export function TaskTypeField({
  deals,
  defaultDealId,
}: {
  deals: DealOption[];
  defaultDealId?: string | null;
}) {
  const [isNextAction, setIsNextAction] = useState(Boolean(defaultDealId));

  return (
    <div className="space-y-2">
      <fieldset>
        <legend className="text-sm font-medium text-ink">タスク種別</legend>
        <div className="mt-1.5 flex flex-wrap gap-4">
          <label className="flex items-center gap-1.5 text-sm text-ink">
            <input
              type="radio"
              name="task_kind"
              checked={isNextAction}
              onChange={() => setIsNextAction(true)}
            />
            next action（案件のタスク）
          </label>
          <label className="flex items-center gap-1.5 text-sm text-ink">
            <input
              type="radio"
              name="task_kind"
              checked={!isNextAction}
              onChange={() => setIsNextAction(false)}
            />
            other task（それ以外）
          </label>
        </div>
      </fieldset>

      {isNextAction ? (
        <Field htmlFor="deal_id" label="関連する案件" required>
          <Select
            id="deal_id"
            name="deal_id"
            defaultValue={defaultDealId ?? ""}
            required
          >
            <option value="">（選択してください）</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.companies?.name ? `${d.companies.name} / ${d.title}` : d.title}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="deal_id" value="" />
      )}
    </div>
  );
}
