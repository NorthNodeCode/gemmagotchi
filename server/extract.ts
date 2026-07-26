/**
 * Course material extraction.
 *
 * University material arrives as lecture PDFs and PowerPoint decks, not as
 * text someone is willing to retype. Both formats are read here and reduced to
 * plain text, which is all the tutor needs — every lesson is generated from the
 * learner's own material, so getting the material in is the whole job.
 *
 * Deliberately no multer: the client base64-encodes the file into a JSON body,
 * which avoids a multipart dependency for what is a handful of uploads.
 */

import AdmZip from "adm-zip";
import { PDFParse } from "pdf-parse";

export interface ExtractResult {
  filename: string;
  text: string;
  chars: number;
  kind: "pdf" | "pptx" | "text";
}

export async function extractDocument(filename: string, buffer: Buffer): Promise<ExtractResult> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".pdf")) {
    return { filename, kind: "pdf", ...withChars(await extractPdf(buffer)) };
  }
  if (lower.endsWith(".pptx")) {
    return { filename, kind: "pptx", ...withChars(extractPptx(buffer)) };
  }
  // .txt/.md and anything else legible: treat as UTF-8.
  return { filename, kind: "text", ...withChars(buffer.toString("utf8")) };
}

function withChars(text: string) {
  const clean = tidy(text);
  return { text: clean, chars: clean.length };
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy().catch(() => {});
  }
}

/**
 * A .pptx is a zip of XML. Slide text lives in <a:t> nodes inside
 * ppt/slides/slideN.xml, and slides must be read in numeric order — the zip
 * lists slide10 before slide2 otherwise.
 */
function extractPptx(buffer: Buffer): string {
  const zip = new AdmZip(buffer);

  const slides = zip
    .getEntries()
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => slideNumber(a.entryName) - slideNumber(b.entryName));

  return slides
    .map((entry) => {
      const xml = entry.getData().toString("utf8");
      const runs = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => decodeXml(m[1]));
      const body = runs.join(" ").replace(/\s+/g, " ").trim();
      return body ? `## Slide ${slideNumber(entry.entryName)}\n${body}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function slideNumber(name: string): number {
  return Number(name.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Collapse the ragged whitespace both formats produce, keep paragraph breaks. */
function tidy(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
