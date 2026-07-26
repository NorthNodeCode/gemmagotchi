import React from "react";
import { motion } from "motion/react";
import { PetCompanion } from "./PetCompanion";
import { ItemSprite } from "./PixelSprite";
import { ITEM } from "../lib/sprites";
import { daysBetween, GRACE_DAYS } from "../lib/petState";
import { now } from "../lib/clock";
import { Play, LifeBuoy, Loader2, Sparkles, Timer, Clock, Flame, Heart, TrendingUp } from "lucide-react";
import { moodFor } from "../lib/petState";
import { courseProgress } from "../lib/course";
import type { Course, Nudge, PetState, StudyLogEntry, SubLesson } from "../types";

interface Props {
  pet: PetState;
  course: Course | null;
  nudge: Nudge | null;
  nudgeLoading: boolean;
  nextModule: SubLesson | null;
  celebrateKey: number;
  studyLog: StudyLogEntry[];
  /** The coach card, built by App (it owns the logs the coach reads). */
  coach?: React.ReactNode;
  onStartLesson: () => void;
  onStartSprint: () => void;
  onRescue: () => void;
  onOpenPlan: () => void;
  onOpenTrajectory: () => void;
}

/** "95m" reads worse than "1h 35m" once someone has actually put the hours in. */
function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export const TodayView: React.FC<Props> = ({
  pet,
  course,
  nudge,
  nudgeLoading,
  nextModule,
  celebrateKey,
  studyLog,
  coach,
  onStartLesson,
  onStartSprint,
  onRescue,
  onOpenPlan,
  onOpenTrajectory,
}) => {
  const away = daysBetween(pet.lastStudiedAt, now());
  const isComeback = away > GRACE_DAYS;
  const cp = course ? courseProgress(course) : { done: 0, total: 0, pct: 0 };
  const done = cp.done;
  const total = cp.total;

  const totalMins = studyLog.reduce((sum, e) => sum + (e.durationMins ?? 0), 0);
  const sessions = studyLog.length;
  const mood = moodFor(pet.health);
  const flagging = mood === "sleepy" || mood === "hungry";

  return (
    <div className="space-y-5">
      {/* What the learner has actually done, so the effort is visible even on
          a day they have not started yet. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric
          icon={Clock}
          label="Total focus time"
          value={formatMinutes(totalMins)}
          sub={sessions === 1 ? "1 session" : `${sessions} sessions`}
          tint="text-[#5E7161]"
        />
        <Metric
          icon={Flame}
          label="Day streak"
          value={String(pet.streak)}
          sub={pet.streak === 0 ? "starts with one lesson" : "keep it going"}
          tint="text-[#D97706]"
        />
        <Metric
          icon={Heart}
          label={`${pet.name}'s vitality`}
          value={`${Math.round(pet.health)}%`}
          sub={
            pet.stage === "egg"
              ? "still an egg"
              : pet.stage === "baby"
              ? "young"
              : "fully grown"
          }
          tint={flagging ? "text-[#B85B56]" : "text-[#5E7161]"}
          alert={flagging}
        />
        <Metric
          icon={Sparkles}
          label="Course progress"
          value={total ? `${Math.round((done / total) * 100)}%` : "—"}
          sub={total ? `${done} of ${total} done` : "no plan yet"}
          tint="text-[#8C593B]"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
      <section className="lg:col-span-5">
        <div className="rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
          <PetCompanion pet={pet} size={172} celebrateKey={celebrateKey} />

          {/* The pet's line. This is where the no-shame rule is most visible:
              a long absence produces warmth, not a guilt trip. */}
          <div className="mt-5 rounded-2xl border border-[#E5E2D9] bg-[#F5F2EA] p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#5E7161]">
              <Sparkles className="h-3 w-3" />
              {isComeback ? "Welcome back" : `${pet.name} says`}
            </div>
            {nudgeLoading ? (
              <div className="flex items-center gap-2 py-1 text-xs text-[#7A837C]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gemma 4 is thinking…
              </div>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-[#2D362E]">
                  {nudge?.nudge ?? `${pet.name} is ready whenever you are.`}
                </p>
                {nudge?.petReaction && (
                  <p className="mt-1.5 text-xs italic text-[#7A837C]">{nudge.petReaction}</p>
                )}
              </>
            )}
          </div>

          {nudge?.actionItem && (
            <div className="mt-3 rounded-2xl border border-[#8BA88E]/40 bg-[#F0F4F0] p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#5E7161]">
                Your next small step
              </div>
              <p className="mt-1 text-sm font-semibold text-[#2D362E]">{nudge.actionItem}</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-5 lg:col-span-7">
        <div className="rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A837C]">
                {course?.subject ?? "No course yet"}
              </span>
              <h2 className="mt-0.5 font-serif text-2xl font-bold">
                {nextModule ? nextModule.title : "You've finished the plan"}
              </h2>
              {nextModule?.description && (
                <p className="mt-1.5 text-sm text-[#7A837C]">{nextModule.description}</p>
              )}
            </div>
            {nextModule && (
              <span className="shrink-0 rounded-full border border-[#E5E2D9] bg-[#F5F2EA] px-2.5 py-1 text-[11px] font-bold text-[#5E7161]">
                ~{nextModule.durationMins} min
              </span>
            )}
          </div>

          {total > 0 && (
            <div className="mb-5">
              <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-[#7A837C]">
                <span>Course progress</span>
                <span>
                  {done} of {total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#E5E2D9]">
                <motion.div
                  className="h-full rounded-full bg-[#5E7161]"
                  initial={false}
                  animate={{ width: `${total ? (done / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              onClick={nextModule ? onStartLesson : onOpenPlan}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#5E7161] py-3.5 text-sm font-bold text-white transition-all hover:bg-[#4E5F51]"
            >
              <Play className="h-4 w-4 fill-current" />
              {nextModule ? "Start this sub-lesson" : "Review the plan"}
            </button>
            <button
              onClick={onStartSprint}
              className="flex items-center justify-center gap-2 rounded-2xl border border-[#E5E2D9] bg-[#FDFCF8] px-5 py-3.5 text-sm font-bold text-[#5E7161] transition-all hover:bg-[#F0F4F0]"
            >
              <Timer className="h-4 w-4" />
              Focus sprint
            </button>
            <button
              onClick={onRescue}
              className="flex items-center justify-center gap-2 rounded-2xl border border-[#E8C5B0] bg-[#FFFBF5] px-5 py-3.5 text-sm font-bold text-[#B4703F] transition-all hover:bg-[#FFF5E9]"
            >
              <LifeBuoy className="h-4 w-4" />
              Can't start?
            </button>
          </div>
          <p className="mt-2.5 text-center text-[11px] text-[#7A837C]">
            Tutor mode teaches and checks. Sprint mode just keeps you company while you work.
          </p>
        </div>

        {coach}

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Total XP" value={String(pet.xp)} item={ITEM.diamond} />
          <Stat label="Gems earned" value={String(studyLog.reduce((s, e) => s + e.gems, 0))} item={ITEM.emerald} />
          <Stat
            label="Growth"
            value={pet.stage === "egg" ? "Egg" : pet.stage === "baby" ? "Young" : "Grown"}
            item={ITEM.raspberry}
          />
        </div>

        <button
          onClick={onOpenTrajectory}
          className="flex w-full items-center gap-3 rounded-2xl border border-[#E5E2D9] bg-white p-4 text-left transition-colors hover:border-[#8BA88E]"
        >
          <div className="rounded-xl border border-[#E5E2D9] bg-[#F0F4F0] p-2.5 text-[#5E7161]">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold">Where this is heading</div>
            <div className="text-[11px] text-[#7A837C]">
              A four-week forecast of staying with it versus drifting.
            </div>
          </div>
          <span className="text-xs font-bold text-[#5E7161]">Open →</span>
        </button>
      </section>
      </div>
    </div>
  );
};

const Metric: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  tint: string;
  alert?: boolean;
}> = ({ icon: Icon, label, value, sub, tint, alert }) => (
  <div
    className={`rounded-2xl border p-4 ${
      alert ? "border-[#E8C5B0] bg-[#FFF5F5]" : "border-[#E5E2D9] bg-white"
    }`}
  >
    <div className="mb-1.5 flex items-center gap-1.5">
      <Icon className={`h-3.5 w-3.5 ${tint}`} />
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A837C]">{label}</span>
    </div>
    <div className="font-serif text-2xl font-bold leading-none">{value}</div>
    <div className="mt-1 text-[11px] text-[#7A837C]">{sub}</div>
  </div>
);

const Stat: React.FC<{ label: string; value: string; item: number }> = ({ label, value, item }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-[#E5E2D9] bg-white p-4">
    <ItemSprite item={item} size={28} />
    <div>
      <div className="text-lg font-bold leading-none text-[#2D362E]">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#7A837C]">
        {label}
      </div>
    </div>
  </div>
);
