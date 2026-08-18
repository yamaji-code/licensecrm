"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

type TableDraft = {
  headers: string[];
  rows: string[][];
};

const DEFAULT_DRAFT: TableDraft = {
  headers: ["項目", "自社案", "先方案"],
  rows: [["", "", ""]],
};

function buildTableMarkdown({ headers, rows }: TableDraft): string {
  const colCount = headers.length;
  const widths = Array.from({ length: colCount }, (_, i) =>
    Math.max(2, headers[i].length, ...rows.map((r) => (r[i] ?? "").length)),
  );
  const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length));
  const line = (cells: string[]) =>
    `| ${cells.map((c, i) => pad(c, widths[i])).join(" | ")} |`;

  const headerLine = line(headers);
  const sepLine = `| ${widths.map((w) => "-".repeat(w)).join(" | ")} |`;
  const rowLines = rows.map((r) => line(headers.map((_, i) => r[i] ?? "")));

  return ["", headerLine, sepLine, ...rowLines, ""].join("\n");
}

const CELL_CLASS =
  "h-8 w-full min-w-[6rem] rounded border border-line bg-white px-1.5 text-xs text-ink " +
  "focus:border-brand-500 focus:outline-none";

/**
 * 表の入力を生のmarkdown（|区切り）で直接編集させると読み書きしづらいため、
 * 見出し・セルをそれぞれ入力欄に分けたグリッドで組み立ててから挿入する。
 */
export function TableBuilder({
  onInsert,
  onCancel,
}: {
  onInsert: (markdown: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<TableDraft>(DEFAULT_DRAFT);

  function setHeader(col: number, text: string) {
    setDraft((prev) => {
      const headers = [...prev.headers];
      headers[col] = text;
      return { ...prev, headers };
    });
  }

  function setCell(row: number, col: number, text: string) {
    setDraft((prev) => {
      const rows = prev.rows.map((r) => [...r]);
      rows[row][col] = text;
      return { ...prev, rows };
    });
  }

  function addColumn() {
    setDraft((prev) => ({
      headers: [...prev.headers, `項目${prev.headers.length + 1}`],
      rows: prev.rows.map((r) => [...r, ""]),
    }));
  }

  function removeColumn(col: number) {
    setDraft((prev) => ({
      headers: prev.headers.filter((_, i) => i !== col),
      rows: prev.rows.map((r) => r.filter((_, i) => i !== col)),
    }));
  }

  function addRow() {
    setDraft((prev) => ({
      ...prev,
      rows: [...prev.rows, prev.headers.map(() => "")],
    }));
  }

  function removeRow(row: number) {
    setDraft((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== row),
    }));
  }

  return (
    <div className="space-y-3 rounded-card border border-line bg-surface p-3">
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              {draft.headers.map((h, col) => (
                <th key={col} className="p-0">
                  <div className="flex items-center gap-1">
                    <input
                      className={CELL_CLASS + " font-medium"}
                      value={h}
                      onChange={(e) => setHeader(col, e.target.value)}
                      aria-label={`列${col + 1}の見出し`}
                    />
                    {draft.headers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeColumn(col)}
                        className="text-ink-faint hover:text-danger"
                        aria-label={`列${col + 1}を削除`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="p-0">
                <button
                  type="button"
                  onClick={addColumn}
                  className="text-xs text-brand-700 hover:underline"
                >
                  ＋列
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {draft.rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="p-0">
                    <input
                      className={CELL_CLASS}
                      value={cell}
                      onChange={(e) => setCell(rIdx, cIdx, e.target.value)}
                      aria-label={`${rIdx + 1}行目・${draft.headers[cIdx]}`}
                    />
                  </td>
                ))}
                <td className="p-0 align-middle">
                  {draft.rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(rIdx)}
                      className="text-ink-faint hover:text-danger"
                      aria-label={`${rIdx + 1}行目を削除`}
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="text-xs text-brand-700 hover:underline"
      >
        ＋行
      </button>

      <div className="flex items-center gap-2 border-t border-line pt-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onInsert(buildTableMarkdown(draft))}
        >
          この表を挿入
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </div>
  );
}
