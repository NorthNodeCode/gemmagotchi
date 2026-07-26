import React, { useCallback, useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { Header, type Tab } from "./components/Header";
import { Onboarding, type OnboardingResult } from "./components/Onboarding";
import { TodayView } from "./components/TodayView";
import { PlanView } from "./components/PlanView";
import { TutorRoom } from "./components/TutorRoom";
import { StoreView } from "./components/StoreView";
import { TrajectoryView } from "./components/TrajectoryView";
import { RescueModal } from "./components/RescueModal";
import { buildCurriculum, fetchNudge, fetchProvider, fetchRescue } from "./services/api";
import { applyDecay, createPet, feedPet, recordStudy, type PetState } from "./lib/petState";
import { advanceDays, now, offsetDays, resetClock } from "./lib/clock";
import { FOODS } from "./lib/sprites";
import type {
  Course,
  Inventory,
  Learner,
  Nudge,
  ProviderInfo,
  RescuePayload,
  SubLesson,
} from "./types";

const KEYS = {
  learner: "gemmagotchi_learner",
  pet: "gemmagotchi_pet",
  course: "gemmagotchi_course",
  gems: "gemmagotchi_gems",
  inventory: "gemmagotchi_inventory",
  minutes: "gemmagotchi_minutes",
};

function load<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [learner, setLearner] = useState<Learner | null>(() => load<Learner | null>(KEYS.learner, null));
  const [pet, setPet] = useState<PetState | null>(() => load<PetState | null>(KEYS.pet, null));
  const [course, setCourse] = useState<Course | null>(() => load<Course | null>(KEYS.course, null));
  const [gems, setGems] = useState<number>(() => load(KEYS.gems, 30));
  const [inventory, setInventory] = useState<Inventory>(() =>
    load<Inventory>(KEYS.inventory, { owned: [], food: {} })
  );
  const [minutesPerDay, setMinutesPerDay] = useState<number>(() => load(KEYS.minutes, 20));

  const [tab, setTab] = useState<Tab>("today");
  const [activeModule, setActiveModule] = useState<SubLesson | null>(null);
  const [building, setBuilding] = useState(false);
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [clockDays, setClockDays] = useState(() => offsetDays());

  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(0);

  const [rescueOpen, setRescueOpen] = useState(false);
  const [rescue, setRescue] = useState<RescuePayload | null>(null);
  const [rescueLoading, setRescueLoading] = useState(false);

  // Persist everything that matters.
  useEffect(() => { if (learner) localStorage.setItem(KEYS.learner, JSON.stringify(learner)); }, [learner]);
  useEffect(() => { if (pet) localStorage.setItem(KEYS.pet, JSON.stringify(pet)); }, [pet]);
  useEffect(() => { if (course) localStorage.setItem(KEYS.course, JSON.stringify(course)); }, [course]);
  useEffect(() => { localStorage.setItem(KEYS.gems, JSON.stringify(gems)); }, [gems]);
  useEffect(() => { localStorage.setItem(KEYS.inventory, JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem(KEYS.minutes, JSON.stringify(minutesPerDay)); }, [minutesPerDay]);

  useEffect(() => {
    fetchProvider().then(setProvider);
  }, []);

  /**
   * Time passing is what makes the pet droop, so decay is applied when the app
   * opens and whenever the demo clock moves — not on a background timer.
   */
  const settlePet = useCallback(() => {
    setPet((p) => (p ? applyDecay(p, now()) : p));
  }, []);

  useEffect(() => {
    settlePet();
  }, [settlePet, clockDays]);

  const nextModule = useMemo(() => course?.modules.find((m) => !m.completed) ?? null, [course]);

  // Ask the pet for a line whenever its situation meaningfully changes.
  useEffect(() => {
    if (!pet || !course) return;
    let cancelled = false;
    setNudgeLoading(true);
    fetchNudge({ pet, subject: course.subject, nextStep: nextModule?.title })
      .then((n) => !cancelled && setNudge(n))
      .finally(() => !cancelled && setNudgeLoading(false));
    return () => {
      cancelled = true;
    };
  }, [pet?.health, pet?.streak, pet?.stage, course?.id, nextModule?.id, clockDays]);

  async function handleOnboarding(result: OnboardingResult) {
    setBuilding(true);
    const t = now();
    try {
      const plan = await buildCurriculum({
        notes: result.notes,
        subject: result.subject,
        examDate: result.examDate,
        minutesPerDay: result.minutesPerDay,
      });
      setCourse({
        id: `course-${t}`,
        title: plan.title,
        subject: result.subject,
        description: plan.description,
        examDate: result.examDate,
        notes: result.notes,
        estimatedWeeks: plan.estimatedWeeks,
        modules: plan.modules,
      });
      setLearner({ character: result.character, name: "You" });
      setPet(createPet(result.petName, result.species, t));
      setMinutesPerDay(result.minutesPerDay);
    } finally {
      setBuilding(false);
    }
  }

  /** A correct answer feeds the pet's growth — this is the core reward. */
  function handleCorrect(weight: number) {
    setPet((p) => {
      if (!p) return p;
      const result = recordStudy(p, now(), weight, 5);
      setGems((g) => g + result.gems);
      if (result.hatched || result.grewUp) {
        confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
      } else if (result.comebackDays > 0) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
      }
      return result.pet;
    });
    setCelebrate((c) => c + 1);
  }

  function handleLessonComplete(moduleId: string, score: number) {
    setCourse((c) =>
      c
        ? {
            ...c,
            modules: c.modules.map((m) => (m.id === moduleId ? { ...m, completed: true } : m)),
          }
        : c
    );
    // Finishing counts for more than any single answer inside it.
    setPet((p) => {
      if (!p) return p;
      const result = recordStudy(p, now(), 2, 15 + score * 2);
      setGems((g) => g + result.gems);
      return result.pet;
    });
  }

  async function openRescue() {
    if (!pet) return;
    setRescueOpen(true);
    setRescueLoading(true);
    try {
      setRescue(await fetchRescue({ pet, subject: course?.subject }));
    } finally {
      setRescueLoading(false);
    }
  }

  function completeRescue() {
    setRescueOpen(false);
    handleCorrect(1);
  }

  function buyFood(foodId: string) {
    const food = FOODS.find((f) => f.id === foodId);
    if (!food || gems < food.cost) return;
    setGems((g) => g - food.cost);
    setInventory((inv) => ({
      ...inv,
      food: { ...inv.food, [foodId]: (inv.food[foodId] ?? 0) + 1 },
    }));
  }

  function useFood(foodId: string) {
    const food = FOODS.find((f) => f.id === foodId);
    if (!food || (inventory.food[foodId] ?? 0) <= 0) return;
    setInventory((inv) => ({
      ...inv,
      food: { ...inv.food, [foodId]: inv.food[foodId] - 1 },
    }));
    setPet((p) => (p ? feedPet(p, food.health) : p));
    setCelebrate((c) => c + 1);
  }

  if (!learner || !pet || !course) {
    return <Onboarding busy={building} onComplete={handleOnboarding} />;
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] font-sans text-[#2D362E] antialiased">
      <Header
        learner={learner}
        pet={pet}
        gems={gems}
        tab={tab}
        provider={provider}
        clockDays={clockDays}
        onTab={(t) => {
          setActiveModule(null);
          setTab(t);
        }}
        onAdvanceDay={() => {
          advanceDays(1);
          setClockDays(offsetDays());
        }}
        onResetClock={() => {
          resetClock();
          setClockDays(0);
        }}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeModule ? (
          <TutorRoom
            course={course}
            module={activeModule}
            pet={pet}
            onCorrect={handleCorrect}
            onLessonComplete={handleLessonComplete}
            onExit={() => setActiveModule(null)}
          />
        ) : (
          <>
            {tab === "today" && (
              <TodayView
                pet={pet}
                course={course}
                nudge={nudge}
                nudgeLoading={nudgeLoading}
                nextModule={nextModule}
                celebrateKey={celebrate}
                onStartLesson={() => nextModule && setActiveModule(nextModule)}
                onRescue={openRescue}
                onOpenPlan={() => setTab("plan")}
              />
            )}
            {tab === "plan" && <PlanView course={course} onStart={setActiveModule} />}
            {tab === "store" && (
              <StoreView gems={gems} pet={pet} inventory={inventory} onBuy={buyFood} onFeed={useFood} />
            )}
            {tab === "trajectory" && (
              <TrajectoryView pet={pet} subject={course.subject} minutesPerDay={minutesPerDay} />
            )}
          </>
        )}
      </main>

      {rescueOpen && (
        <RescueModal
          pet={pet}
          data={rescue}
          loading={rescueLoading}
          onComplete={completeRescue}
          onClose={() => setRescueOpen(false)}
        />
      )}

      <footer className="border-t border-[#E5E2D9] px-4 py-6 text-center text-[11px] text-[#7A837C]">
        Every lesson, nudge and mark on this page is generated by{" "}
        <span className="font-bold text-[#5E7161]">{provider?.model ?? "Gemma 4"}</span>
        {provider?.provider === "local" && " running entirely on this machine"}.
      </footer>
    </div>
  );
}
