"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { uploadMeetingImage } from "./actions";
import { TableBuilder } from "./table-builder";
import type { MeetingSnippet } from "@/lib/types";
import { Button, Textarea } from "@/components/ui";

/**
 * MTG LOGの要旨入力欄。テキスト自体はmarkdownとして保存する。
 * 「表を挿入」はテーブルのひな形を、「画像を添付」はアップロード後の画像リンクを、
 * 「よく使う文章」は登録済みスニペットの本文を、いずれもカーソル位置に挿入する。
 */
export function MtgLogEditor({
  name = "summary",
  defaultValue,
  dealId,
  snippets,
}: {
  name?: string;
  defaultValue?: string;
  dealId?: string | null;
  snippets: MeetingSnippet[];
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showTableBuilder, setShowTableBuilder] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function insertAtCursor(text: string) {
    const el = textareaRef.current;
    if (!el) {
      setValue((prev) => prev + text);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    setValue(next);
    // setValue直後はDOMがまだ古い値のため、次フレームでカーソル位置を復元する
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      if (dealId) formData.set("deal_id", dealId);
      const url = await uploadMeetingImage(formData);
      insertAtCursor(`\n![画像](${url})\n`);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "画像のアップロードに失敗しました。",
      );
    } finally {
      setIsUploading(false);
    }
  }

  function handleSnippetSelect(e: ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    e.target.value = "";
    const snippet = snippets.find((s) => s.id === id);
    if (snippet) {
      insertAtCursor(snippet.body);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowTableBuilder((prev) => !prev)}
        >
          表を挿入
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? "アップロード中…" : "画像を添付"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {snippets.length > 0 && (
          <select
            className="min-h-8 rounded-lg border border-line bg-white px-2 text-xs text-ink-soft"
            defaultValue=""
            onChange={handleSnippetSelect}
          >
            <option value="" disabled>
              よく使う文章を挿入…
            </option>
            {snippets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {uploadError && <p className="text-xs text-danger">{uploadError}</p>}

      {showTableBuilder && (
        <TableBuilder
          onInsert={(markdown) => {
            insertAtCursor(markdown);
            setShowTableBuilder(false);
          }}
          onCancel={() => setShowTableBuilder(false)}
        />
      )}

      <Textarea
        ref={textareaRef}
        id={name}
        name={name}
        rows={6}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="話した内容・決めたこと。表は「表を挿入」、写真は「画像を添付」から入れられます。"
      />
    </div>
  );
}
