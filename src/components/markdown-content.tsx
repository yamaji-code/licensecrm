import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import type { ComponentProps } from "react";

/**
 * MTG LOGの要旨（summary）はmarkdownとして保存する。表（条件交渉の項目比較など）と
 * 添付画像（商談資料・現場写真のリンク）を表示するためのレンダラー。
 */
export function MarkdownContent({ content }: { content: string }) {
  // Windows由来のCRLF（\r\n）が混じっていると、改行のたびに余分な空行が
  // 入って見えることがあるため、描画前にLFへ正規化する。
  const normalized = content.replace(/\r\n?/g, "\n");

  return (
    <div className="space-y-2 text-sm leading-relaxed text-ink-soft [&_a]:text-brand-700 [&_a]:underline [&_strong]:text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
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
