/**
 * Virtual clock.
 *
 * The accountability loop plays out over days, which is unwatchable in a live
 * demo. Every part of the app that asks "what time is it" asks this instead of
 * Date.now(), so we can push the world forward a day at a time on stage and
 * show a week of habit in under a minute.
 *
 * Nothing here is demo-only trickery: real time still advances normally. The
 * offset is simply added on top.
 */

const KEY = "gemmagotchi_clock_offset";

let offsetMs = readOffset();

function readOffset(): number {
  if (typeof localStorage === "undefined") return 0;
  const raw = localStorage.getItem(KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

const listeners = new Set<() => void>();

/** The current time in the app's world. Use this instead of Date.now(). */
export function now(): number {
  return Date.now() + offsetMs;
}

/** Push the world forward. Used by the demo control in the header. */
export function advanceDays(days: number): void {
  offsetMs += days * 86_400_000;
  persist();
}

export function resetClock(): void {
  offsetMs = 0;
  persist();
}

export function offsetDays(): number {
  return Math.round(offsetMs / 86_400_000);
}

function persist(): void {
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, String(offsetMs));
  listeners.forEach((fn) => fn());
}

export function subscribeClock(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Formats a virtual timestamp as a short day label. */
export function dayLabel(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
