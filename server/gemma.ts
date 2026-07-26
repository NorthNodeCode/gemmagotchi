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

function cacheKeyFor(opts: GenerateOptions): string {
  return `${opts.cacheKey || "default"}::${opts.thinking ? "T" : "-"}::${opts.system || ""}::${opts.prompt}`;
}

export function clearGemmaCache(): void {
  cache.clear();
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

  if (CONFIGURED_PROVIDER === "local" || (CONFIGURED_PROVIDER === "auto" && local)) {
    if (local) return { provider: "local", model: GEMMA_MODEL_LOCAL, ready: true };
  }
  if (hosted) return { provider: "hosted", model: GEMMA_MODEL_HOSTED, ready: true };
  if (local) return { provider: "local", model: GEMMA_MODEL_LOCAL, ready: true };
  return { provider: "none", model: "offline-fallback", ready: false };
}

// ---------------------------------------------------------------------------
// Local path — Ollama, OpenAI-compatible endpoint
// ---------------------------------------------------------------------------

async function generateLocal(opts: GenerateOptions): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.prompt });

  const res = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer ollama" },
    body: JSON.stringify({
      model: GEMMA_MODEL_LOCAL,
      messages,
      temperature: TEMPERATURE,
      top_p: TOP_P,
      max_tokens: opts.maxTokens ?? 2048,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama returned ${res.status}: ${await res.text()}`);
  }
  const data: any = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
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
    // auto — prefer local (no quota, no network), fall back to hosted.
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
  const lastBrace = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (lastBrace !== -1 && lastBrace < text.length - 1) text = text.slice(0, lastBrace + 1);
  return text.trim();
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
    return { data: JSON.parse(stripFences(first.text)) as T, meta: metaOf(first) };
  } catch {
    // Retry once, quoting the malformed output back at the model.
    const retry = await generate({
      ...opts,
      system,
      cacheKey: `${opts.cacheKey || "default"}:repair`,
      prompt: `${opts.prompt}\n\nYour previous reply was not valid JSON:\n${first.text.slice(0, 800)}\n\nReturn the same information as valid JSON only.`,
    });
    return { data: JSON.parse(stripFences(retry.text)) as T, meta: metaOf(retry) };
  }
}

function metaOf(r: GenerateResult): Omit<GenerateResult, "text"> {
  return { provider: r.provider, model: r.model, cached: r.cached, ms: r.ms };
}
