import React from "react";

/**
 * A small markdown renderer for lesson content.
 *
 * Deliberately not a library: lessons only ever contain headings, paragraphs,
 * lists, code, bold/italic and inline code, and shipping a parser for that is
 * cheaper than auditing one. Anything unrecognised renders as plain text,
 * which is a safe failure mode for model output.
 */

export const Markdown: React.FC<{ content: string; className?: string }> = ({
  content,
  className = "",
}) => {
  const blocks = parseBlocks(content || "");
  return (
    <div className={`space-y-3 text-[15px] leading-relaxed text-[#2D362E] ${className}`}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
};

type Block =
  | { kind: "h"; level: number; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "code"; text: string }
  | { kind: "quote"; text: string };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code
    if (/^\s*```/.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      i++;
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: "h", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "quote", text: body.join(" ") });
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block.
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ kind: "p", text: para.join(" ") });
  }

  return blocks;
}

function isBlockStart(line: string): boolean {
  return (
    /^\s*```/.test(line) ||
    /^#{1,6}\s/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+[.)]\s+/.test(line) ||
    /^\s*>\s?/.test(line)
  );
}

const Block: React.FC<{ block: Block }> = ({ block }) => {
  switch (block.kind) {
    case "h": {
      const size =
        block.level <= 2 ? "text-xl" : block.level === 3 ? "text-lg" : "text-base";
      return (
        <h3 className={`font-serif font-bold text-[#2D362E] ${size} pt-1`}>
          <Inline text={block.text} />
        </h3>
      );
    }
    case "ul":
      return (
        <ul className="ml-1 space-y-1.5">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#8BA88E]" />
              <span>
                <Inline text={it} />
              </span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="ml-1 space-y-1.5">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F0F4F0] text-[11px] font-bold text-[#5E7161]">
                {i + 1}
              </span>
              <span>
                <Inline text={it} />
              </span>
            </li>
          ))}
        </ol>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-2xl border border-[#E5E2D9] bg-[#F5F2EA] p-4 font-mono text-[12.5px] leading-relaxed text-[#2D362E]">
          <code>{block.text}</code>
        </pre>
      );
    case "quote":
      return (
        <blockquote className="border-l-[3px] border-[#8BA88E] bg-[#F5F2EA]/60 py-1 pl-4 italic text-[#5E7161]">
          <Inline text={block.text} />
        </blockquote>
      );
    default:
      return (
        <p>
          <Inline text={block.text} />
        </p>
      );
  }
};

/**
 * The model is told never to emit LaTeX, but cached lessons and slip-ups still
 * contain it, so residual TeX is translated to readable Unicode rather than
 * shown raw. This is a translator for the handful of commands that actually
 * appear in study notes, not a math renderer.
 */
const SIMPLE_TEX: Array<[RegExp, string]> = [
  [/\\rightarrow|\\to\b/g, "→"],
  [/\\leftarrow\b/g, "←"],
  [/\\Rightarrow\b/g, "⇒"],
  [/\\times\b/g, "×"],
  [/\\cdot\b/g, "·"],
  [/\\div\b/g, "÷"],
  [/\\pm\b/g, "±"],
  [/\\leq?\b/g, "≤"],
  [/\\geq?\b/g, "≥"],
  [/\\neq?\b/g, "≠"],
  [/\\approx\b/g, "≈"],
  [/\\infty\b/g, "∞"],
  [/\\sum\b/g, "Σ"],
  [/\\pi\b/g, "π"],
  [/\\Delta\b/g, "Δ"],
  [/\\mu\b/g, "μ"],
  [/\\sigma\b/g, "σ"],
  [/\\phi\b/g, "φ"],
  [/\\lambda\b/g, "λ"],
  [/\\theta\b/g, "θ"],
  [/\\alpha\b/g, "α"],
  [/\\beta\b/g, "β"],
];

const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", n: "ⁿ", x: "ˣ",
};
const SUBSCRIPTS: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋", n: "ₙ", x: "ₓ", i: "ᵢ", j: "ⱼ",
};

function toScript(body: string, table: Record<string, string>): string {
  const mapped = [...body].map((ch) => table[ch]);
  return mapped.every(Boolean) ? mapped.join("") : `(${body})`;
}

function detex(text: string): string {
  if (!text.includes("$") && !text.includes("\\")) return text;

  return text.replace(/\$([^$]+)\$/g, (_m, tex: string) => detexBody(tex)).replace(/\\\((.+?)\\\)/g, (_m, tex: string) => detexBody(tex));
}

function detexBody(tex: string): string {
  let out = tex;
  out = out.replace(/\\text\{([^}]*)\}/g, "$1");
  out = out.replace(/\\mathrm\{([^}]*)\}/g, "$1");
  out = out.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1/$2");
  out = out.replace(/\^\{([^}]*)\}/g, (_m, b: string) => toScript(b, SUPERSCRIPTS));
  out = out.replace(/\^(\w)/g, (_m, b: string) => toScript(b, SUPERSCRIPTS));
  out = out.replace(/_\{([^}]*)\}/g, (_m, b: string) => toScript(b, SUBSCRIPTS));
  out = out.replace(/_(\w)/g, (_m, b: string) => toScript(b, SUBSCRIPTS));
  for (const [re, sub] of SIMPLE_TEX) out = out.replace(re, sub);
  out = out.replace(/\\[a-zA-Z]+/g, "");
  out = out.replace(/[{}]/g, "");
  return out.replace(/\s+/g, " ").trim();
}

/**
 * Inline formatting: `code`, **bold**, *italic*. Split on the whole set at once
 * so nesting order doesn't matter for the shapes lessons actually use.
 */
const Inline: React.FC<{ text: string }> = ({ text: rawText }) => {
  const text = detex(rawText);
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (/^`[^`]+`$/.test(part)) {
          return (
            <code
              key={i}
              className="rounded-md border border-[#E5E2D9] bg-[#F5F2EA] px-1.5 py-0.5 font-mono text-[0.85em] text-[#5E7161]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (/^\*\*[^*]+\*\*$/.test(part)) {
          return (
            <strong key={i} className="font-bold text-[#2D362E]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (/^\*[^*]+\*$/.test(part)) {
          return (
            <em key={i} className="italic text-[#5E7161]">
              {part.slice(1, -1)}
            </em>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
};
