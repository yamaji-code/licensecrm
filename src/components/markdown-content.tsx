import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import type { ComponentProps } from "react";
import { splitDateMentions } from "@/lib/date-mention";

// react-markdown が渡してくるHASTのうち、ここで使う分だけ
type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

// 中の文字列をいじってはいけない要素
const SKIP_TAGS = new Set(["code", "pre", "a"]);

/*
 * 本文中の @2026/11/10（Tue） を span で包み、本文より濃いグレーで見せる。
 * 1年後に見返したときに、日付が本文の中から拾えるようにするため。
 */
function rehypeDateMention() {
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      if (!node.children) return;
      if (node.tagName && SKIP_TAGS.has(node.tagName)) return;

      const next: HastNode[] = [];
      for (const child of node.children) {
        if (child.type !== "text" || typeof child.value !== "string") {
          walk(child);
          next.push(child);
          continue;
        }
        const parts = splitDateMentions(child.value);
        if (!parts.some((part) => part.isMention)) {
          next.push(child);
          continue;
        }
        for (const part of parts) {
          next.push(
            part.isMention
              ? {
                  type: "element",
                  tagName: "span",
                  properties: { className: ["date-mention"] },
                  children: [{ type: "text", value: part.text }],
                }
              : { type: "text", value: part.text },
          );
        }
      }
      node.children = next;
    };
    walk(tree);
  };
}

/**
 * MTG LOGの要旨（summary）はmarkdownとして保存する。表（条件交渉の項目比較など）と
 * 添付画像（商談資料・現場写真のリンク）を表示するためのレンダラー。
 */
export function MarkdownContent({ content }: { content: string }) {
  // Windows由来のCRLF（\r\n）が混じっていると、改行のたびに余分な空行が
  // 入って見えることがあるため、描画前にLFへ正規化する。
  const normalized = content.replace(/\r\n?/g, "\n");

  return (
    <div className="space-y-2 text-sm leading-relaxed text-ink-soft [&_a]:text-brand-700 [&_a]:underline [&_strong]:text-ink [&_.date-mention]:rounded [&_.date-mention]:bg-surface [&_.date-mention]:px-1 [&_.date-mention]:font-medium [&_.date-mention]:text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeDateMention]}
        components={{
          // remark-breaksが改行のたびに<br>を挿入するため、p要素にwhitespace-pre-wrapを
          // 併用すると、<br>の直後に残る改行テキストノードまで表示上の改行として扱われ、
          // 改行が二重に入って見える。<br>だけに任せて、pはそのままにする。
          table: (props) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs" {...props} />
            </div>
          ),
          th: (props) => (
            <th
              className="border border-line bg-surface px-2 py-1 text-left font-medium text-ink"
              {...props}
            />
          ),
          td: (props) => <td className="border border-line px-2 py-1" {...props} />,
          a: (props) => <a target="_blank" rel="noreferrer" {...props} />,
          // 添付画像はSupabase Storageの動的URLでサイズも都度異なり、next/imageのremotePatterns/
          // サイズ指定は不要な複雑さになるため plain img を使う。
          img: ({ alt, ...props }: ComponentProps<"img">) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="mt-1 max-w-full rounded-lg border border-line"
              alt={alt ?? ""}
              {...props}
            />
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
