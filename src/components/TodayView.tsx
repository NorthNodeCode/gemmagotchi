import React from "react";
import { motion } from "motion/react";
import { PetCompanion } from "./PetCompanion";
import { ItemSprite } from "./PixelSprite";
import { ITEM } from "../lib/sprites";
import { daysBetween, GRACE_DAYS } from "../lib/petState";
import { now } from "../lib/clock";
import { Play, LifeBuoy, Loader2, Sparkles, Timer } from "lucide-react";
import type { Course, Nudge, PetState, SubLesson } from "../types";

interface Props {
  pet: PetState;
  course: Course | null;
  nudge: Nudge | null;
  nudgeLoading: boolean;
  nextModule: SubLesson | null;
  celebrateKey: number;
  onStartLesson: () => void;
  onStartSprint: () => void;
  onRescue: () => void;
  onOpenPlan: () => void;
}

export const TodayView: React.FC<Props> = ({
  pet,
  course,
  nudge,
  nudgeLoading,
  nextModule,
  celebrateKey,
  onStartLesson,
  onStartSprint,
  onRescue,
  onOpenPlan,
}) => {
  const away = daysBetween(pet.lastStudiedAt, now());
  const isComeback = away > GRACE_DAYS;
  const done = course?.modules.filter((m) => m.completed).length ?? 0;
  const total = course?.modules.length ?? 0;

  return (
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

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Day streak" value={String(pet.streak)} item={ITEM.wheat} />
          <Stat label="Total XP" value={String(pet.xp)} item={ITEM.diamond} />
          <Stat
            label="Growth"
            value={pet.stage === "egg" ? "Egg" : pet.stage === "baby" ? "Young" : "Grown"}
            item={ITEM.raspberry}
          />
        </div>
      </section>
    </div>
  );
};

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
