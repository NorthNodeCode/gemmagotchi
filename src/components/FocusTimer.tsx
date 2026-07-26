import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Coffee, LifeBuoy, Minus, Pause, Play, RotateCcw, Sparkles, X } from "lucide-react";
import { AnimalSprite, ItemSprite } from "./PixelSprite";
import { EGG_FOR_SPECIES } from "../lib/sprites";
import { moodFor, type PetState } from "../lib/petState";
import type { Nudge } from "../types";

/**
 * A pomodoro timer that outlives the screen you started it on.
 *
 * The timer used to be a page, which meant navigating away silently threw the
 * session away — the one thing a focus timer must never do. The clock now
 * lives in app state and this is only its window: minimise it, go read a
 * lesson, and it is still counting when you come back.
 */

export const WORK_LENGTHS = [15, 25, 45];
export const BREAK_MINUTES = 5;

export interface TimerState {
  /** Chosen work length in minutes. 0.5 is a dev-only short round. */
  minutes: number;
  secondsLeft: number;
  running: boolean;
  phase: "work" | "break";
  /** Completed work rounds this sitting. */
  rounds: number;
}

export function initialTimer(minutes = 25): TimerState {
  return { minutes, secondsLeft: minutes * 60, running: false, phase: "work", rounds: 0 };
}

export const DEV_MODE =
  typeof localStorage !== "undefined" && localStorage.getItem("gemmagotchi_dev") === "1";

interface Props {
  timer: TimerState;
  setTimer: React.Dispatch<React.SetStateAction<TimerState>>;
  pet: PetState;
  subject?: string;
  nudge: Nudge | null;
  nudgeLoading: boolean;
  onRescue: () => void;
  onMinimise: () => void;
  onClose: () => void;
}

export const FocusTimer: React.FC<Props> = ({
  timer,
  setTimer,
  pet,
  subject,
  nudge,
  nudgeLoading,
  onRescue,
  onMinimise,
  onClose,
}) => {
  const working = timer.phase === "work";
  const total = working ? timer.minutes * 60 : BREAK_MINUTES * 60;
  const progress = total > 0 ? 1 - timer.secondsLeft / total : 0;

  const started = timer.secondsLeft !== total || timer.running || timer.rounds > 0;

  return (
    /**
     * Clicking away minimises rather than closes. A running clock is work in
     * progress, and a stray click on the backdrop must never be able to throw
     * it away — dismissing a session is only ever explicit.
     */
    <div
      onClick={onMinimise}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D362E]/60 p-4 backdrop-blur-xs"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-[#E5E2D9] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#E5E2D9] px-5 py-3.5">
          <div>
            <h3 className="font-serif text-base font-bold">
              {working ? "Pomodoro timer" : "Break"}
            </h3>
            <p className="text-[11px] text-[#7A837C]">
              {subject ?? "Any work you like"}
              {timer.rounds > 0 && ` · ${timer.rounds} done`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onMinimise}
              title={started ? "Keep it running in the background" : "Hide"}
              aria-label="Minimise timer"
              className="rounded-full p-2 text-[#7A837C] transition-colors hover:bg-[#F5F2EA] hover:text-[#2D362E]"
            >
              {started ? <Minus className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="px-6 py-6 text-center">
          <div className="mb-4 flex justify-center">
            <motion.div
              animate={timer.running ? { y: [0, -5, 0] } : { y: 0 }}
              transition={{ repeat: Infinity, duration: working ? 2.4 : 3.4, ease: "easeInOut" }}
            >
              {pet.stage === "egg" ? (
                <ItemSprite item={EGG_FOR_SPECIES[pet.species]} size={54} />
              ) : (
                <AnimalSprite
                  species={pet.species}
                  stage={pet.stage === "adult" ? "adult" : "baby"}
                  size={64}
                  fps={working ? 4 : 2}
                />
              )}
            </motion.div>
          </div>

          <div className="font-mono text-[64px] font-bold leading-none tabular-nums">
            {format(timer.secondsLeft)}
          </div>

          <div className="mx-auto mt-5 h-2 max-w-xs overflow-hidden rounded-full bg-[#E5E2D9]">
            <motion.div
              className={`h-full rounded-full ${working ? "bg-[#5E7161]" : "bg-[#D97706]"}`}
              initial={false}
              animate={{ width: `${progress * 100}%` }}
              transition={{ ease: "linear", duration: 0.9 }}
            />
          </div>

          {!timer.running && timer.secondsLeft === timer.minutes * 60 && working && (
            <div className="mt-5 flex justify-center gap-2">
              {(DEV_MODE ? [0.5, ...WORK_LENGTHS] : WORK_LENGTHS).map((m) => (
                <button
                  key={m}
                  onClick={() => setTimer(initialTimer(m))}
                  className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all ${
                    timer.minutes === m
                      ? "border-[#5E7161] bg-[#5E7161] text-white"
                      : "border-[#E5E2D9] bg-[#FDFCF8] text-[#7A837C] hover:border-[#8BA88E]"
                  }`}
                >
                  {m < 1 ? "30s" : `${m}m`}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 flex justify-center gap-2">
            <button
              onClick={() => setTimer((t) => ({ ...t, running: !t.running }))}
              className="flex items-center gap-2 rounded-2xl bg-[#5E7161] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#4E5F51]"
            >
              {timer.running ? (
                <>
                  <Pause className="h-4 w-4 fill-current" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  {timer.secondsLeft === total ? "Start" : "Resume"}
                </>
              )}
            </button>
            {timer.secondsLeft !== total && (
              <button
                onClick={() => setTimer((t) => initialTimer(t.minutes))}
                aria-label="Reset"
                className="rounded-2xl border border-[#E5E2D9] px-4 py-3 text-[#7A837C] transition-colors hover:bg-[#F5F2EA]"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>

          {working ? (
            <div className="mt-3 flex items-center justify-center gap-4">
              <button
                onClick={onRescue}
                className="flex items-center gap-1.5 text-xs font-bold text-[#B4703F] underline underline-offset-2"
              >
                <LifeBuoy className="h-3.5 w-3.5" /> Stuck? Two-minute rescue
              </button>
              {started && (
                <button
                  onClick={onClose}
                  className="text-xs font-bold text-[#7A837C] underline underline-offset-2 hover:text-[#2D362E]"
                >
                  End session
                </button>
              )}
            </div>
          ) : (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#7A837C]">
              <Coffee className="h-3.5 w-3.5" /> Actually rest — that is what makes the next
              round work.
            </p>
          )}
        </div>

        <div className="border-t border-[#E5E2D9] bg-[#F5F2EA] px-5 py-3.5">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#5E7161]">
            <Sparkles className="h-3 w-3" /> {pet.name} says
          </div>
          <p className="text-xs leading-relaxed">
            {nudgeLoading
              ? "Gemma 4 is thinking…"
              : nudge?.nudge ??
                (timer.running
                  ? `${pet.name} settles in beside your work.`
                  : `${pet.name} is ready when you are.`)}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

/**
 * The pill that proves the timer is still running once the window is closed.
 * Without it, a minimised timer is indistinguishable from a lost one.
 */
export const TimerPill: React.FC<{
  timer: TimerState;
  onOpen: () => void;
}> = ({ timer, onOpen }) => (
  <button
    onClick={onOpen}
    title="Open the focus timer"
    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold tabular-nums transition-colors ${
      timer.phase === "work"
        ? "border-[#8BA88E] bg-[#F0F4F0] text-[#5E7161] hover:bg-[#E7EEE7]"
        : "border-[#F0D194] bg-[#FFF8F0] text-[#D97706] hover:bg-[#FDF0DC]"
    }`}
  >
    {timer.running ? (
      <motion.span
        animate={{ opacity: [1, 0.35, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="h-1.5 w-1.5 rounded-full bg-current"
      />
    ) : (
      <Pause className="h-3 w-3 fill-current" />
    )}
    {format(timer.secondsLeft)}
  </button>
);

function format(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
