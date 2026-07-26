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
import { SprintRoom } from "./components/SprintRoom";
import { DrillsView } from "./components/DrillsView";
import { AddTopicModal, type TopicDraft } from "./components/AddTopicModal";
import {
  buildCurriculum,
  fetchNudge,
  fetchProvider,
  fetchRescue,
  prefetchLesson,
} from "./services/api";
import { applyDecay, createPet, feedPet, recordStudy, stageFor, type PetState } from "./lib/petState";
import {
  allModules,
  allNotes,
  markModuleComplete,
  migrateCourse,
  nextModuleFor,
  titleFromFilename,
  topicOf,
} from "./lib/course";
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
  StudyLogEntry,
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
  studyLog: "gemmagotchi_studylog",
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
  if (courses.length) return courses.map(migrateCourse);
  const legacy = load<Course | null>(KEYS.course, null);
  return legacy ? [migrateCourse(legacy)] : [];
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
  const [studyLog, setStudyLog] = useState<StudyLogEntry[]>(() => load<StudyLogEntry[]>(KEYS.studyLog, []));

  const [tab, setTab] = useState<Tab>("today");
  const [activeModule, setActiveModule] = useState<SubLesson | null>(null);
  const [sprinting, setSprinting] = useState(false);
  const [building, setBuilding] = useState(false);
  const [planProgress, setPlanProgress] = useState<{ current: number; total: number; title: string } | null>(null);
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [clockDays, setClockDays] = useState(() => offsetDays());

  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(0);

  const [addTopicOpen, setAddTopicOpen] = useState(false);
  const [socraticOpen, setSocraticOpen] = useState(false);
  const [gemsOpen, setGemsOpen] = useState(false);

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
  useEffect(() => { localStorage.setItem(KEYS.studyLog, JSON.stringify(studyLog)); }, [studyLog]);

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

  const nextModule = useMemo(() => nextModuleFor(course), [course]);

  const updateCourse = useCallback((id: string, fn: (c: Course) => Course) => {
    setCourses((all) => all.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  /**
   * Plan ONE topic. Sending a single week's material rather than the whole
   * course keeps the prompt small, which matters a lot on a laptop model, and
   * it means each week's plan is about that week rather than a blur.
   */
  const planTopicPlan = useCallback(
    async (input: { subject: string; examDate?: string; notes: string }) => {
      return buildCurriculum({
        notes: input.notes,
        subject: input.subject,
        examDate: input.examDate ?? "",
        minutesPerDay,
      });
    },
    [minutesPerDay]
  );

  /** Create a course from its first topic's material. */
  const planCourse = useCallback(
    async (req: {
      subject: string;
      examDate: string;
      notes: string;
      files?: string[];
      topicTitle?: string;
      minutesPerDay?: number;
    }) => {
      const t = now();
      const plan = await planTopicPlan({
        subject: req.subject,
        examDate: req.examDate,
        notes: req.notes,
      });
      const created: Course = {
        id: `course-${t}`,
        title: req.subject,
        subject: req.subject,
        description: plan.description,
        examDate: req.examDate,
        estimatedWeeks: plan.estimatedWeeks,
        topics: [
          {
            id: `topic-${t}`,
            title: req.topicTitle || plan.title,
            week: 1,
            notes: req.notes,
            files: req.files ?? [],
            modules: plan.modules,
          },
        ],
      };
      setCourses((all) => [...all, created]);
      setActiveCourseId(created.id);
      return created;
    },
    [planTopicPlan]
  );

  async function addCourse(req: { subject: string; examDate: string; notes: string; files?: string[] }) {
    setBuilding(true);
    try {
      await planCourse(req);
      setTab("plan");
    } finally {
      setBuilding(false);
    }
  }

  /**
   * Add topics to an existing course. Several files become several weeks, and
   * they are planned one after another because Ollama serialises requests
   * anyway — parallelising would only make the progress display lie.
   */
  async function addTopics(
    courseId: string,
    batch: Array<{ title: string; notes: string; files: string[] }>
  ) {
    const target = courses.find((c) => c.id === courseId);
    if (!target) return;
    let week = Math.max(0, ...target.topics.map((t) => t.week));

    setBuilding(true);
    try {
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        week += 1;
        setPlanProgress({ current: i + 1, total: batch.length, title: item.title });
        const plan = await planTopicPlan({
          subject: target.subject,
          examDate: target.examDate,
          notes: item.notes,
        });
        const topicWeek = week;
        updateCourse(courseId, (c) => ({
          ...c,
          topics: [
            ...c.topics,
            {
              id: `topic-${now()}-${i}`,
              title: item.title || plan.title,
              week: topicWeek,
              notes: item.notes,
              files: item.files,
              modules: plan.modules,
            },
          ],
        }));
      }
      setTab("plan");
    } finally {
      setPlanProgress(null);
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
      notes: topicOf(course, nextModule.id)?.notes ?? allNotes(course),
      subject: course.subject,
      previousLessons: allModules(course).filter((m) => m.completed).map((m) => m.title),
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

  /**
   * Every completed piece of study lands here. It is persisted, so "total focus
   * time" is a real total rather than a number that resets whenever the tab is
   * closed — the stat is only worth showing if it survives.
   */
  const logStudy = useCallback(
    (entry: Omit<StudyLogEntry, "id" | "at">) => {
      setStudyLog((log) => [
        ...log,
        { ...entry, id: `log-${Date.now()}-${log.length}`, at: now() },
      ]);
    },
    []
  );

  /**
   * A correct answer feeds the pet's growth — this is the core reward.
   *
   * The reward is computed OUTSIDE the state updater on purpose. Paying gems or
   * writing a log entry from inside one makes the updater impure, and React
   * invokes updaters more than once — which quietly paid every reward twice.
   */
  function handleCorrect(weight: number) {
    if (!pet) return;
    const result = recordStudy(pet, now(), weight, 5);
    setPet(result.pet);
    setGems((g) => g + result.gems);
    if (result.hatched || result.grewUp) {
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
    } else if (result.comebackDays > 0) {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
    }
    setCelebrate((c) => c + 1);
  }

  function handleLessonComplete(moduleId: string, score: number) {
    const finished = course ? allModules(course).find((m) => m.id === moduleId) : undefined;
    if (course) {
      updateCourse(course.id, (c) => markModuleComplete(c, moduleId));
    }
    // Finishing counts for more than any single answer inside it.
    if (!pet) return;
    const result = recordStudy(pet, now(), 2, 15 + score * 2);
    setPet(result.pet);
    setGems((g) => g + result.gems);
    logStudy({
      label: finished?.title ?? "Sub-lesson",
      gems: result.gems,
      wasComeback: result.comebackDays > 0,
      durationMins: finished?.durationMins ?? 10,
      kind: "lesson",
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
    logStudy({
      label: "2-minute rescue",
      gems: 5,
      wasComeback: false,
      durationMins: 2,
      kind: "rescue",
    });
  }

  /**
   * A finished sprint counts as study: it pays gems and energy by the minute
   * and updates the streak the same way a sub-lesson does. Time spent with the
   * material is study — only the shape is different.
   */
  function completeSprint(minutes: number) {
    if (!pet) return;
    const result = recordStudy(pet, now(), 2, Math.round(minutes * 2));
    setPet({ ...result.pet, health: Math.min(100, result.pet.health + minutes) });
    setGems((g) => g + result.gems);
    logStudy({
      label: `${minutes < 1 ? "30-second" : `${minutes}-minute`} focus sprint`,
      gems: result.gems,
      wasComeback: result.comebackDays > 0,
      durationMins: minutes,
      kind: "sprint",
    });
    setCelebrate((c) => c + 1);
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
  }

  /**
   * Gems buy help for the pet, never a shortcut past the studying. The surge
   * runs growth through the same stage recompute a correct answer does, so
   * hatching still fires the celebration.
   */
  function redeemReward(reward: Reward) {
    if (!pet || gems < reward.cost) return;
    setGems((g) => g - reward.cost);

    if (reward.id === "masterclass") {
      setInventory((inv) =>
        inv.owned.includes("masterclass") ? inv : { ...inv, owned: [...inv.owned, "masterclass"] }
      );
      return;
    }

    if (reward.id === "elixir") {
      setPet(feedPet(pet, 50));
    } else {
      const growth = pet.growth + 3;
      const stage = stageFor(growth);
      if (stage !== pet.stage) confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
      setPet({ ...pet, growth, stage });
    }
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
          setSprinting(false);
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
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {sprinting || tab === "focus" ? (
          <SprintRoom
            pet={pet}
            course={course}
            hasMasterclass={inventory.owned.includes("masterclass")}
            studyLog={studyLog}
            onComplete={completeSprint}
            onCorrect={handleCorrect}
            onRescue={openRescue}
            onExit={() => {
              setSprinting(false);
              setTab("today");
            }}
          />
        ) : activeModule ? (
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
                studyLog={studyLog}
                onOpenTrajectory={() => setTab("trajectory")}
                onStartLesson={() => nextModule && setActiveModule(nextModule)}
                onStartSprint={() => setTab("focus")}
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
            {tab === "plan" && (
              <PlanView
                course={course}
                onStart={setActiveModule}
                onAddTopic={() => setAddTopicOpen(true)}
                onBigReview={() => setTab("drills")}
              />
            )}
            {tab === "drills" && (
              <DrillsView
                course={course}
                hasMasterclass={inventory.owned.includes("masterclass")}
                onCorrect={handleCorrect}
                onDrillComplete={(label, score, total) =>
                  logStudy({
                    label: `Drill: ${label}`,
                    gems: score * 5,
                    wasComeback: false,
                    durationMins: total,
                    kind: "drill",
                  })
                }
              />
            )}
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

      {addTopicOpen && course && (
        <AddTopicModal
          courseSubject={course.subject}
          nextWeek={Math.max(0, ...course.topics.map((t) => t.week)) + 1}
          busy={building}
          progress={planProgress}
          onAdd={async (drafts: TopicDraft[]) => {
            await addTopics(course.id, drafts);
            setAddTopicOpen(false);
          }}
          onClose={() => setAddTopicOpen(false)}
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

    </div>
  );
}
