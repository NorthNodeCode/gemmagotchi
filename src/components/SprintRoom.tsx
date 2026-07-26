import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, History, LifeBuoy, Loader2, Pause, Play, RotateCcw, Sparkles, Zap } from "lucide-react";
import { PetCompanion } from "./PetCompanion";
import { fetchNudge } from "../services/api";
import { moodFor, type PetState } from "../lib/petState";
import { allNotes, currentTopic } from "../lib/course";
import { QuestionCard } from "./TutorRoom";
import type { CheckQuestion, Course, Nudge, StudyLogEntry } from "../types";

/**
 * Sprint mode: no lesson, just time.
 *
 * The other half of procrastination is the sessions that never start because
 * the task feels too big to begin. Here the only commitment is minutes, and
 * the pet sits and watches them pass — the point is company, not instruction.
 *
 * Rewards are deliberately the same currency a lesson pays, because time spent
 * with the material genuinely is study; only the shape is different.
 */

const LENGTHS = [15, 25, 45];
const NUDGE_EVERY_SECONDS = 5 * 60;

/**
 * A half-minute sprint so the completion payout can actually be tested without
 * sitting through fifteen real minutes. Off unless explicitly switched on.
 */
const DEV_MODE =
  typeof localStorage !== "undefined" && localStorage.getItem("gemmagotchi_dev") === "1";

interface Props {
  pet: PetState;
  course: Course | null;
  hasMasterclass: boolean;
  studyLog: StudyLogEntry[];
  onComplete: (minutes: number) => void;
  onCorrect: (weight: number) => void;
  onRescue: () => void;
  onExit: () => void;
}

export const SprintRoom: React.FC<Props> = ({
  pet,
  course,
  hasMasterclass,
  studyLog,
  onComplete,
  onCorrect,
  onRescue,
  onExit,
}) => {
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [nudging, setNudging] = useState(false);
  const lastNudgeAt = useRef(25 * 60);

  // Optional drills alongside the timer — retrieval practice while you work.
  const [drills, setDrills] = useState<CheckQuestion[]>([]);
  const [drillIndex, setDrillIndex] = useState(0);
  const [drillsLoading, setDrillsLoading] = useState(false);
  const drillsRequested = useRef(false);

  // The countdown itself.
  useEffect(() => {
    if (!running || finished) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [running, finished]);

  // Finishing pays out once, then stops the clock.
  useEffect(() => {
    if (remaining > 0 || finished) return;
    setFinished(true);
    setRunning(false);
    onComplete(minutes);
  }, [remaining, finished, minutes, onComplete]);

  /**
   * The pet says something every five minutes. This is the whole reason the
   * timer is worth more than a stopwatch: someone is sitting with you.
   */
  useEffect(() => {
    if (!running || finished) return;
    if (lastNudgeAt.current - remaining < NUDGE_EVERY_SECONDS) return;
    lastNudgeAt.current = remaining;

    let cancelled = false;
    setNudging(true);
    fetchNudge({
      pet: { ...pet, mood: moodFor(pet.health) } as any,
      subject: course?.subject,
      nextStep: `staying with a ${minutes}-minute focus sprint — ${Math.ceil(remaining / 60)} minutes left`,
    })
      .then((n) => !cancelled && setNudge(n))
      .finally(() => !cancelled && setNudging(false));
    return () => {
      cancelled = true;
    };
  }, [running, remaining, finished, pet.health, course?.subject, minutes]);

  /**
   * One drill set per sprint, fetched when the timer starts. Generation on a
   * laptop model takes a while, so it is requested once and appears whenever it
   * lands rather than gating the timer on it.
   */
  useEffect(() => {
    if (!running || drillsRequested.current || !course) return;
    drillsRequested.current = true;
    const topic = currentTopic(course);
    setDrillsLoading(true);
    fetch("/api/ai/drill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: course.subject,
        notes: topic?.notes ?? allNotes(course),
        count: 5,
        scope: "module",
        topics: topic ? [topic.title] : [],
      }),
    })
      .then((r) => r.json())
      .then((d) =>
        setDrills(
          (d.questions ?? []).map((q: any, i: number) => ({
            ...q,
            id: q.id || `s${i}`,
            kind: q.kind === "text" ? "text" : "mcq",
          }))
        )
      )
      .catch(() => {})
      .finally(() => setDrillsLoading(false));
  }, [running, course]);

  function choose(m: number) {
    setMinutes(m);
    setRemaining(m * 60);
    lastNudgeAt.current = m * 60;
    setFinished(false);
    setNudge(null);
  }

  function reset() {
    setRunning(false);
    setFinished(false);
    setRemaining(minutes * 60);
    lastNudgeAt.current = minutes * 60;
    setNudge(null);
  }

  const elapsed = minutes * 60 - remaining;
  const progress = minutes > 0 ? elapsed / (minutes * 60) : 0;

  return (
    <div>
      <button
        onClick={onExit}
        className="mb-4 flex items-center gap-1.5 text-xs font-bold text-[#7A837C] transition-colors hover:text-[#2D362E]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to today
      </button>

      <div className="grid gap-5 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <div className="rounded-3xl border border-[#E5E2D9] bg-white p-8 text-center shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A837C]">
              {course?.subject ?? "Focus sprint"}
            </span>

            <div className="my-6 font-mono text-[76px] font-bold leading-none tabular-nums text-[#2D362E]">
              {format(remaining)}
            </div>

            <div className="mx-auto mb-7 h-2 max-w-sm overflow-hidden rounded-full bg-[#E5E2D9]">
              <motion.div
                className="h-full rounded-full bg-[#5E7161]"
                initial={false}
                animate={{ width: `${progress * 100}%` }}
                transition={{ ease: "linear", duration: 0.9 }}
              />
            </div>

            {!running && !finished && (
              <div className="mb-6 flex justify-center gap-2">
                {(DEV_MODE ? [0.5, ...LENGTHS] : LENGTHS).map((m) => (
                  <button
                    key={m}
                    onClick={() => choose(m)}
                    className={`rounded-2xl border px-4 py-2 text-xs font-bold transition-all ${
                      minutes === m
                        ? "border-[#5E7161] bg-[#5E7161] text-white"
                        : "border-[#E5E2D9] bg-[#FDFCF8] text-[#7A837C] hover:border-[#8BA88E]"
                    }`}
                  >
                    {m < 1 ? "30s" : `${m} min`}
                  </button>
                ))}
              </div>
            )}

            {finished ? (
              <div>
                <p className="font-serif text-xl font-bold text-[#5E7161]">
                  {minutes < 1 ? "30 seconds" : `${minutes} minutes`} done.
                </p>
                <p className="mt-1 text-sm text-[#7A837C]">
                  {pet.name} sat with you the whole way.
                </p>
                <button
                  onClick={reset}
                  className="mx-auto mt-5 flex items-center gap-2 rounded-2xl bg-[#5E7161] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#4E5F51]"
                >
                  <RotateCcw className="h-4 w-4" /> Another sprint
                </button>
              </div>
            ) : (
              <div className="flex flex-col justify-center gap-2.5 sm:flex-row">
                <button
                  onClick={() => setRunning((r) => !r)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#5E7161] px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#4E5F51]"
                >
                  {running ? (
                    <>
                      <Pause className="h-4 w-4 fill-current" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />{" "}
                      {elapsed > 0 ? "Resume" : minutes < 1 ? "Start 30 seconds" : `Start ${minutes} minutes`}
                    </>
                  )}
                </button>
                {elapsed > 0 && (
                  <button
                    onClick={reset}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-[#E5E2D9] px-5 py-3.5 text-sm font-bold text-[#7A837C] transition-colors hover:bg-[#F5F2EA]"
                  >
                    <RotateCcw className="h-4 w-4" /> Reset
                  </button>
                )}
                <button
                  onClick={onRescue}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#E8C5B0] bg-[#FFFBF5] px-5 py-3.5 text-sm font-bold text-[#B4703F] transition-colors hover:bg-[#FFF5E9]"
                >
                  <LifeBuoy className="h-4 w-4" /> Feeling stuck?
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="lg:col-span-5">
          <div className="rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
            <div className="mb-3 flex justify-center">
              <span className="rounded-full border border-[#8BA88E]/40 bg-[#F0F4F0] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#5E7161]">
                {running ? "Keeping you company" : "Waiting with you"}
              </span>
            </div>

            <PetCompanion pet={pet} size={150} showBars={false} />

            <div className="mt-5 rounded-2xl border border-[#E5E2D9] bg-[#F5F2EA] p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#5E7161]">
                <Sparkles className="h-3 w-3" /> {pet.name} says
              </div>
              {nudging ? (
                <div className="flex items-center gap-2 py-1 text-xs text-[#7A837C]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gemma 4 is thinking…
                </div>
              ) : (
                <p className="text-sm leading-relaxed">
                  {nudge?.nudge ??
                    (running
                      ? `${pet.name} settles in next to your work.`
                      : `Pick a length and press start — ${pet.name} will sit with you.`)}
                </p>
              )}
            </div>

            <p className="mt-4 text-center text-[11px] text-[#7A837C]">
              A finished sprint pays 2 gems and 1 energy a minute, and counts towards your
              streak just like a sub-lesson.
            </p>
          </div>

          {/* Recent sessions, so the timer sits in a history rather than alone. */}
          {studyLog.length > 0 && (
            <div className="mt-5 rounded-3xl border border-[#E5E2D9] bg-white p-5">
              <h4 className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7A837C]">
                <History className="h-3.5 w-3.5" /> Recent sessions
              </h4>
              <ul className="space-y-1.5">
                {[...studyLog].slice(-5).reverse().map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-[11px]">
                    <span className="rounded-md bg-[#F5F2EA] px-1.5 py-0.5 font-mono text-[10px] text-[#5E7161]">
                      {e.kind}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{e.label}</span>
                    <span className="shrink-0 text-[#7A837C]">{e.durationMins}m</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Drills sit below rather than beside: they are optional company for the
          timer, not a second thing competing for attention at the same size. */}
      {(drills.length > 0 || drillsLoading) && !finished && (
        <div className="mx-auto mt-5 max-w-3xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-serif text-lg font-bold">
              <Zap className="h-4 w-4 text-[#D97706]" /> While you work
            </h3>
            {drills.length > 0 && (
              <span className="text-[11px] text-[#7A837C]">
                {Math.min(drillIndex + 1, drills.length)} of {drills.length} · optional
              </span>
            )}
          </div>

          {drillsLoading && drills.length === 0 ? (
            <div className="flex items-center gap-2 rounded-3xl border border-[#E5E2D9] bg-white p-5 text-xs text-[#7A837C]">
              <Loader2 className="h-4 w-4 animate-spin" /> Gemma 4 is writing a few questions on{" "}
              {currentTopic(course)?.title ?? course?.subject} — answer them whenever you like.
            </div>
          ) : drillIndex < drills.length ? (
            <QuestionCard
              key={drills[drillIndex].id}
              question={drills[drillIndex]}
              index={drillIndex}
              total={drills.length}
              subject={course?.subject ?? ""}
              hasMasterclass={hasMasterclass}
              onResolved={(correct) => correct && onCorrect(1)}
              onNext={() => setDrillIndex((i) => i + 1)}
            />
          ) : (
            <div className="rounded-3xl border border-[#E5E2D9] bg-[#F0F4F0] p-5 text-center text-xs font-bold text-[#5E7161]">
              That's the set — back to the work itself.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function format(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
