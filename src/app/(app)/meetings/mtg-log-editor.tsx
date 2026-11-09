"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { uploadMeetingImage } from "./actions";
import { DateInserter } from "./date-inserter";
import { TableBuilder } from "./table-builder";
import type { MeetingSnippet } from "@/lib/types";
import { Button, Textarea } from "@/components/ui";

/**
 * MTG LOGの要旨入力欄。テキスト自体はmarkdownとして保存する。
 * 「表を挿入」はテーブルのひな形を、「画像を添付」はアップロード後の画像リンクを、
 * 「よく使う文章」は登録済みスニペットの本文を、いずれもカーソル位置に挿入する。
 * 「@」を打つと日付の挿入パネルが開く（1年後に見返しても分かるよう年から入れる）。
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
  const [showDateInserter, setShowDateInserter] = useState(false);
  // 「@」から開いたときの、その「@」の位置。日付に置き換えるために覚えておく。
  // ツールバーから開いたときは null（カーソル位置にそのまま挿入する）
  const [atSignIndex, setAtSignIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /*
   * 入力欄を中身の高さに合わせて伸ばす。
   * 高さ固定だと、長いログでは欄の中だけがスクロールして全体を見渡せない
   * （書いた内容を上下に行き来しながら直すのがやりにくい）。
   * 上限は置かない。上限を付けると長いログでは結局欄の中がスクロールするので、
   * 欄は全文の高さまで伸ばし、足りない分はページ側をスクロールしてもらう。
   */
  const fitHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    // いったん縮めてから測らないと、消したときに高さが戻らない
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(fitHeight, [fitHeight, value]);

  /*
   * 幅が変わると折り返しが変わるので測り直す。
   * ウィンドウの拡縮・サイドバーの開閉のほか、裏のタブで開いて幅0のまま
   * 測ってしまった場合も、表に出た時点でここで直る。
   * 高さの変化では測り直さない（自分で変えた高さに反応して堂々巡りになるため）。
   */
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    let lastWidth = -1;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width === lastWidth) return;
      lastWidth = width;
      fitHeight();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitHeight]);

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

  /*
   * 「@」を打った瞬間に日付の挿入パネルを出す。
   * 行頭か空白の直後に打たれたときだけ。メールアドレスなどの途中では出さない。
   */
  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    const pos = e.target.selectionStart ?? next.length;
    const typedAtSign =
      next.length === value.length + 1 &&
      next[pos - 1] === "@" &&
      (pos === 1 || /[\s\u3000]/.test(next[pos - 2] ?? ""));

    setValue(next);

    if (typedAtSign) {
      setAtSignIndex(pos - 1);
      setShowDateInserter(true);
    } else if (showDateInserter && atSignIndex !== null) {
      // 「@」のあとに続けて何か打ったら、日付を入れる意図ではないとみなして閉じる
      closeDateInserter();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape" && showDateInserter) {
      e.preventDefault();
      closeDateInserter();
    }
  }

  function closeDateInserter() {
    setShowDateInserter(false);
    setAtSignIndex(null);
  }

  /** 「@」から開いたときはその「@」を日付で置き換える。ツールバーからならカーソル位置に挿入する */
  function insertDate(text: string) {
    if (atSignIndex === null) {
      insertAtCursor(text);
    } else {
      const at = atSignIndex;
      setValue(value.slice(0, at) + text + value.slice(at + 1));
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        const pos = at + text.length;
        el.setSelectionRange(pos, pos);
      });
    }
    closeDateInserter();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setAtSignIndex(null);
            setShowDateInserter((prev) => !prev);
          }}
        >
          日付を挿入
        </Button>

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

      {showDateInserter && (
        <DateInserter onInsert={insertDate} onCancel={closeDateInserter} />
      )}

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
        className="min-h-[18rem] resize-none leading-relaxed"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="話した内容・決めたこと。「@」で日付、表は「表を挿入」、写真は「画像を添付」から入れられます。"
      />
    </div>
  );
}
