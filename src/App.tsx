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
import { DevSprites } from "./components/DevSprites";
import { CoursesView } from "./components/CoursesView";
import { SocraticModal } from "./components/SocraticModal";
import {
  buildCurriculum,
  fetchNudge,
  fetchProvider,
  fetchRescue,
  prefetchLesson,
} from "./services/api";
import { applyDecay, createPet, feedPet, recordStudy, stageFor, type PetState } from "./lib/petState";
import { GemSanctuary, type Reward } from "./components/GemSanctuary";
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
  /** Legacy single-course key, migrated into `courses` on first load. */
  course: "gemmagotchi_course",
  courses: "gemmagotchi_courses",
  activeCourse: "gemmagotchi_active_course",
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

/**
 * Courses started life as a single object. Anyone who used the app before
 * modules existed still has that key, so it is folded into the list rather
 * than dropped — losing someone's course would be an unforced betrayal.
 */
function loadCourses(): Course[] {
  const courses = load<Course[]>(KEYS.courses, []);
  if (courses.length) return courses;
  const legacy = load<Course | null>(KEYS.course, null);
  return legacy ? [legacy] : [];
}

export default function App() {
  // Sprite inspector lives off the main app entirely — no state, no onboarding.
  if (typeof location !== "undefined" && location.pathname === "/dev/sprites") {
    return <DevSprites />;
  }
  return <Gemmagotchi />;
}

function Gemmagotchi() {
  const [learner, setLearner] = useState<Learner | null>(() => load<Learner | null>(KEYS.learner, null));
  const [pet, setPet] = useState<PetState | null>(() => load<PetState | null>(KEYS.pet, null));
  const [courses, setCourses] = useState<Course[]>(loadCourses);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(() => {
    const stored = load<string | null>(KEYS.activeCourse, null);
    const all = loadCourses();
    return all.some((c) => c.id === stored) ? stored : all[0]?.id ?? null;
  });
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

  const [socraticOpen, setSocraticOpen] = useState(false);
  const [gemsOpen, setGemsOpen] = useState(false);
  const [pitchOpen, setPitchOpen] = useState(false);

  const [rescueOpen, setRescueOpen] = useState(false);
  const [rescue, setRescue] = useState<RescuePayload | null>(null);
  const [rescueLoading, setRescueLoading] = useState(false);

  // Persist everything that matters.
  useEffect(() => { if (learner) localStorage.setItem(KEYS.learner, JSON.stringify(learner)); }, [learner]);
  useEffect(() => { if (pet) localStorage.setItem(KEYS.pet, JSON.stringify(pet)); }, [pet]);
  useEffect(() => { localStorage.setItem(KEYS.courses, JSON.stringify(courses)); }, [courses]);
  useEffect(() => {
    if (activeCourseId) localStorage.setItem(KEYS.activeCourse, JSON.stringify(activeCourseId));
  }, [activeCourseId]);
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

  /** The module today's lesson comes from. Everything downstream reads this. */
  const course = useMemo(
    () => courses.find((c) => c.id === activeCourseId) ?? courses[0] ?? null,
    [courses, activeCourseId]
  );

  const nextModule = useMemo(() => course?.modules.find((m) => !m.completed) ?? null, [course]);

  const updateCourse = useCallback((id: string, fn: (c: Course) => Course) => {
    setCourses((all) => all.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  /** Plan a course from raw material. Shared by onboarding and "Add module". */
  const planCourse = useCallback(
    async (req: { subject: string; examDate: string; notes: string; minutesPerDay?: number }) => {
      const t = now();
      const plan = await buildCurriculum({
        notes: req.notes,
        subject: req.subject,
        examDate: req.examDate,
        minutesPerDay: req.minutesPerDay ?? minutesPerDay,
      });
      const created: Course = {
        id: `course-${t}`,
        title: plan.title,
        subject: req.subject,
        description: plan.description,
        examDate: req.examDate,
        notes: req.notes,
        estimatedWeeks: plan.estimatedWeeks,
        modules: plan.modules,
      };
      setCourses((all) => [...all, created]);
      setActiveCourseId(created.id);
      return created;
    },
    [minutesPerDay]
  );

  async function addCourse(req: { subject: string; examDate: string; notes: string }) {
    setBuilding(true);
    try {
      await planCourse(req);
      setTab("plan");
    } finally {
      setBuilding(false);
    }
  }

  function deleteCourse(id: string) {
    setCourses((all) => {
      const remaining = all.filter((c) => c.id !== id);
      if (id === activeCourseId) setActiveCourseId(remaining[0]?.id ?? null);
      return remaining;
    });
  }

  /**
   * Warm the next sub-lesson in the background. Generation on a local model
   * takes a while, so paying that cost while the learner is reading the
   * dashboard makes pressing Start feel immediate.
   */
  useEffect(() => {
    if (!course || !nextModule || activeModule) return;
    prefetchLesson({
      moduleTitle: nextModule.title,
      sourceExcerpt: nextModule.sourceExcerpt,
      notes: course.notes,
      subject: course.subject,
      previousLessons: course.modules.filter((m) => m.completed).map((m) => m.title),
    });
  }, [course?.id, nextModule?.id, activeModule]);

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
    try {
      await planCourse({
        subject: result.subject,
        examDate: result.examDate,
        notes: result.notes,
        minutesPerDay: result.minutesPerDay,
      });
      setLearner({ character: result.character, name: "You" });
      setPet(createPet(result.petName, result.species, now()));
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
    if (course) {
      updateCourse(course.id, (c) => ({
        ...c,
        modules: c.modules.map((m) => (m.id === moduleId ? { ...m, completed: true } : m)),
      }));
    }
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

  /**
   * Gems buy help for the pet, never a shortcut past the studying. The surge
   * runs growth through the same stage recompute a correct answer does, so
   * hatching still fires the celebration.
   */
  function redeemReward(reward: Reward) {
    if (gems < reward.cost) return;
    setGems((g) => g - reward.cost);

    if (reward.id === "masterclass") {
      setInventory((inv) =>
        inv.owned.includes("masterclass") ? inv : { ...inv, owned: [...inv.owned, "masterclass"] }
      );
      return;
    }

    setPet((p) => {
      if (!p) return p;
      if (reward.id === "elixir") return feedPet(p, 50);
      const growth = p.growth + 3;
      const stage = stageFor(growth);
      if (stage !== p.stage) confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
      return { ...p, growth, stage };
    });
    setCelebrate((c) => c + 1);
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
        onOpenSocratic={() => setSocraticOpen(true)}
        onOpenGems={() => setGemsOpen(true)}
        onOpenPitch={() => setPitchOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeModule ? (
          <TutorRoom
            course={course}
            module={activeModule}
            pet={pet}
            hasMasterclass={inventory.owned.includes("masterclass")}
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
            {tab === "courses" && (
              <CoursesView
                courses={courses}
                activeCourseId={course.id}
                busy={building}
                onSetActive={setActiveCourseId}
                onDelete={deleteCourse}
                onAdd={addCourse}
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

      {gemsOpen && (
        <GemSanctuary
          gems={gems}
          pet={pet}
          inventory={inventory}
          onRedeem={redeemReward}
          onClose={() => setGemsOpen(false)}
        />
      )}

      {socraticOpen && (
        <SocraticModal pet={pet} course={course} onClose={() => setSocraticOpen(false)} />
      )}

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
