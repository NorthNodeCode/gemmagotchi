/**
 * Gemmagotchi — the single Gemma 4 seam.
 *
 * Every model call in this application goes through generate() below. There is
 * no other place where a model is invoked. Two providers are supported:
 *
 *   hosted : Gemma 4 via the Gemini API (@google/genai)  → GEMMA_MODEL_HOSTED
 *   local  : Gemma 4 via Ollama's OpenAI-compatible API  → GEMMA_MODEL_LOCAL
 *
 * Both run the SAME open-weights model family. The local path exists so the
 * app keeps working with no network, no API key and no rate limit — the whole
 * point of Gemma being open weights.
 */

import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Model identifiers. These are the only two model strings in the codebase.
// ---------------------------------------------------------------------------

/** Hosted Gemma 4 on the Gemini API (MoE, ~4B active params, 256K context). */
export const GEMMA_MODEL_HOSTED = "gemma-4-26b-a4b-it";

/** Local Gemma 4 via Ollama (effective-4B edge model, runs on a laptop). */
export const GEMMA_MODEL_LOCAL = "gemma4:e4b";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

/** "hosted" | "local" | "auto" — auto prefers local, falls back to hosted. */
type Provider = "hosted" | "local" | "auto";
const CONFIGURED_PROVIDER = (process.env.GEMMA_PROVIDER || "auto") as Provider;

// Google's recommended sampling settings for Gemma 4, all use cases.
const TEMPERATURE = 1.0;
const TOP_P = 0.95;
const TOP_K = 64;

export interface GenerateOptions {
  /** Goes in the native `system` role — Gemma 4 supports this properly. */
  system?: string;
  /** The user turn. */
  prompt: string;
  /**
   * Internal step-by-step reasoning before answering. Costs latency and
   * tokens, so it is reserved for planning/curriculum work.
   */
  thinking?: boolean;
  /** Cache key namespace, so identical prompts in different features differ. */
  cacheKey?: string;
  maxTokens?: number;
}

export interface GenerateResult {
  text: string;
  provider: "hosted" | "local";
  model: string;
  cached: boolean;
  ms: number;
}

// ---------------------------------------------------------------------------
// Response cache. Demo rehearsals re-run identical prompts dozens of times;
// on the free tier that is the difference between a working demo and a 429.
// ---------------------------------------------------------------------------

const cache = new Map<string, { text: string; provider: "hosted" | "local"; model: string }>();

/**
 * The cache also lives on disk, because rehearsal runs restart the server
 * constantly and losing a minute-long local generation to a restart hurts.
 * Load is best-effort; a corrupt or missing file just means a cold cache.
 */
const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "gemma-cache.json");

try {
  const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  for (const [k, v] of Object.entries(raw)) cache.set(k, v as any);
  console.log(`  [gemma] warmed ${cache.size} cached responses from disk`);
} catch {
  /* cold cache */
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistCache(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(Object.fromEntries(cache)), "utf8");
    } catch (err) {
      console.warn("[gemma] could not persist cache:", (err as Error)?.message);
    }
  }, 1500);
}

function cacheKeyFor(opts: GenerateOptions): string {
  return `${opts.cacheKey || "default"}::${opts.thinking ? "T" : "-"}::${opts.system || ""}::${opts.prompt}`;
}

export function clearGemmaCache(): void {
  cache.clear();
  persistCache();
}

// ---------------------------------------------------------------------------
// Provider availability
// ---------------------------------------------------------------------------

let localAvailable: boolean | null = null;
let localCheckedAt = 0;
const LOCAL_RECHECK_MS = 30_000;

async function isLocalAvailable(): Promise<boolean> {
  const now = Date.now();
  if (localAvailable !== null && now - localCheckedAt < LOCAL_RECHECK_MS) {
    return localAvailable;
  }
  localCheckedAt = now;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      localAvailable = false;
      return false;
    }
    const data: any = await res.json();
    // Only count it as available if the Gemma 4 model is actually pulled.
    const names: string[] = (data.models || []).map((m: any) => m.name || m.model || "");
    localAvailable = names.some((n) => n.startsWith("gemma4"));
    return localAvailable;
  } catch {
    localAvailable = false;
    return false;
  }
}

function hostedClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

/** What the app will actually use right now — surfaced in the UI footer. */
export async function activeProvider(): Promise<{ provider: string; model: string; ready: boolean }> {
  const local = await isLocalAvailable();
  const hosted = !!process.env.GEMINI_API_KEY;

  if (CONFIGURED_PROVIDER === "hosted" && hosted) {
    return { provider: "hosted", model: GEMMA_MODEL_HOSTED, ready: true };
  }
  if (local) return { provider: "local", model: GEMMA_MODEL_LOCAL, ready: true };
  if (hosted) return { provider: "hosted", model: GEMMA_MODEL_HOSTED, ready: true };
  return { provider: "none", model: "offline-fallback", ready: false };
}

// ---------------------------------------------------------------------------
// Local path — Ollama, OpenAI-compatible endpoint
// ---------------------------------------------------------------------------

async function generateLocal(opts: GenerateOptions): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.prompt });

  // Ollama's native endpoint rather than its OpenAI-compatible one: that shim
  // has no top_k, and Gemma 4's recommended sampling includes top_k = 64.
  // It also lets us turn thinking off explicitly, which matters on a laptop
  // where hidden reasoning tokens cost real seconds.
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GEMMA_MODEL_LOCAL,
      messages,
      stream: false,
      think: !!opts.thinking,
      options: {
        temperature: TEMPERATURE,
        top_p: TOP_P,
        top_k: TOP_K,
        num_predict: opts.maxTokens ?? 1024,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama returned ${res.status}: ${await res.text()}`);
  }
  const data: any = await res.json();
  // The reasoning block arrives in a separate `thinking` field, so the answer
  // is never contaminated by it.
  return data.message?.content ?? "";
}

// ---------------------------------------------------------------------------
// Hosted path — Gemini API, with exponential backoff on rate limits
// ---------------------------------------------------------------------------

const BACKOFF_MS = [1000, 2000, 4000, 8000];

async function generateHosted(opts: GenerateOptions): Promise<string> {
  const ai = hostedClient();
  if (!ai) throw new Error("GEMINI_API_KEY is not set");

  const config: Record<string, any> = {
    temperature: TEMPERATURE,
    topP: TOP_P,
    topK: TOP_K,
    maxOutputTokens: opts.maxTokens ?? 2048,
  };
  if (opts.system) config.systemInstruction = opts.system;
  // Thinking is expensive; only planning-shaped work asks for it.
  if (opts.thinking) config.thinkingConfig = { thinkingLevel: "high" };

  let lastError: any = null;
  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMMA_MODEL_HOSTED,
        contents: opts.prompt,
        config,
      });
      return response.text ?? "";
    } catch (err: any) {
      lastError = err;
      const code = err?.status ?? err?.code;
      const isRateLimited = code === 429 || /RESOURCE_EXHAUSTED|429/.test(String(err?.message));
      if (!isRateLimited || attempt === BACKOFF_MS.length) throw err;
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// The seam
// ---------------------------------------------------------------------------

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const started = Date.now();
  const key = cacheKeyFor(opts);

  const hit = cache.get(key);
  if (hit) {
    return { ...hit, cached: true, ms: Date.now() - started };
  }

  const local = await isLocalAvailable();
  const hostedReady = !!process.env.GEMINI_API_KEY;

  // Order of attempts depends on configuration; each entry is a real option.
  const order: Array<"local" | "hosted"> = [];
  if (CONFIGURED_PROVIDER === "local") {
    if (local) order.push("local");
    if (hostedReady) order.push("hosted");
  } else if (CONFIGURED_PROVIDER === "hosted") {
    if (hostedReady) order.push("hosted");
    if (local) order.push("local");
  } else {
    // auto — local first. On this hardware local Gemma is within ~3x of the
    // hosted API's measured throughput, and it has no rate limits, no network
    // dependency and no quota to blow mid-demo. Hosted is one .env edit away
    // (GEMMA_PROVIDER=hosted) and remains the automatic fallback if Ollama
    // isn't running.
    if (local) order.push("local");
    if (hostedReady) order.push("hosted");
  }

  if (order.length === 0) {
    throw new Error(
      "No Gemma 4 provider available: set GEMINI_API_KEY, or run `ollama pull gemma4:e4b`."
    );
  }

  let lastError: any = null;
  for (const provider of order) {
    try {
      const text =
        provider === "local" ? await generateLocal(opts) : await generateHosted(opts);
      const model = provider === "local" ? GEMMA_MODEL_LOCAL : GEMMA_MODEL_HOSTED;
      cache.set(key, { text, provider, model });
      persistCache();
      return { text, provider, model, cached: false, ms: Date.now() - started };
    } catch (err) {
      lastError = err;
      if (provider === "local") localAvailable = false;
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// JSON helpers
//
// Gemma on the Gemini API does not accept responseMimeType, so structured
// output is requested in the prompt and parsed defensively here.
// ---------------------------------------------------------------------------

const JSON_RULE =
  "Respond with valid JSON only. No markdown fences, no commentary, no text before or after the JSON object.";

export function stripFences(raw: string): string {
  let text = raw.trim();
  // Remove ```json ... ``` or ``` ... ``` wrappers.
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  // Some models prepend a sentence; salvage the outermost JSON value.
  const firstBrace = text.search(/[[{]/);
  if (firstBrace > 0) text = text.slice(firstBrace);
  return text.trim();
}

/**
 * Parse model JSON, repairing the failures that actually happen in practice:
 * trailing commas, and output cut off mid-structure when the token budget runs
 * out. Truncation is the common one — the content up to the cut is usually
 * perfectly good, so we close the open brackets and keep it rather than
 * throwing away a whole lesson's worth of questions.
 */
export function parseLoose<T = any>(raw: string): T {
  const text = stripFences(raw);

  try {
    return JSON.parse(text) as T;
  } catch {
    /* fall through to repair */
  }

  // Drop trailing commas before a closing bracket.
  const decommaed = text.replace(/,\s*([}\]])/g, "$1");
  try {
    return JSON.parse(decommaed) as T;
  } catch {
    /* fall through to truncation repair */
  }

  return JSON.parse(closeTruncated(decommaed)) as T;
}

/**
 * Walk the text tracking string state and bracket depth, cut back to the last
 * position where the structure was complete enough to close, then close it.
 */
function closeTruncated(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  /** Index just past the last complete array/object element. */
  let lastSafe = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") {
      stack.pop();
      if (stack.length === 1) lastSafe = i + 1;
    } else if (ch === "," && stack.length === 1) lastSafe = i;
  }

  // Cut back to the last element boundary so we never keep a half-written one.
  let body = lastSafe > 0 ? text.slice(0, lastSafe) : text;
  body = body.replace(/,\s*$/, "");

  // Re-derive what still needs closing after the cut.
  const closers: string[] = [];
  let s = false;
  let e = false;
  for (const ch of body) {
    if (s) {
      if (e) e = false;
      else if (ch === "\\") e = true;
      else if (ch === '"') s = false;
      continue;
    }
    if (ch === '"') s = true;
    else if (ch === "{") closers.push("}");
    else if (ch === "[") closers.push("]");
    else if (ch === "}" || ch === "]") closers.pop();
  }

  return body + closers.reverse().join("");
}

/**
 * Ask Gemma for JSON and parse it. One reparse-retry with a stricter nudge
 * before giving up, because a stray fence should not cost the user a feature.
 */
export async function generateJSON<T = any>(
  opts: GenerateOptions
): Promise<{ data: T; meta: Omit<GenerateResult, "text"> }> {
  const system = [opts.system, JSON_RULE].filter(Boolean).join("\n\n");

  const first = await generate({ ...opts, system });
  try {
    return { data: parseLoose<T>(first.text), meta: metaOf(first) };
  } catch {
    // Retry once, quoting the malformed output back at the model.
    const retry = await generate({
      ...opts,
      system,
      cacheKey: `${opts.cacheKey || "default"}:repair`,
      prompt: `${opts.prompt}\n\nYour previous reply was not valid JSON:\n${first.text.slice(0, 800)}\n\nReturn the same information as valid JSON only.`,
    });
    return { data: parseLoose<T>(retry.text), meta: metaOf(retry) };
  }
}

function metaOf(r: GenerateResult): Omit<GenerateResult, "text"> {
  return { provider: r.provider, model: r.model, cached: r.cached, ms: r.ms };
}
