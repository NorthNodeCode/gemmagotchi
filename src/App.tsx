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
import { DrillsView } from "./components/DrillsView";
import { AddTopicModal, type TopicDraft } from "./components/AddTopicModal";
import {
  BREAK_MINUTES,
  FocusTimer,
  TimerPill,
  initialTimer,
  type TimerState,
} from "./components/FocusTimer";
import {
  buildCurriculum,
  fetchNudge,
  fetchProvider,
  fetchRescue,
  prefetchLesson,
} from "./services/api";
import { applyDecay, createPet, feedPet, recordStudy, stageFor, type PetState } from "./lib/petState";
import { cropById, type PetSpecies } from "./lib/sprites";
import { FarmView, WATER_COST } from "./components/FarmView";

/** What another egg costs. Steep enough to be a milestone, not a whim. */
const ADOPTION_COST = 40;
import { DEFAULT_PROFILE, paceFromSeconds, remeasure, weakTopics } from "./lib/learnerModel";
import { CoachCard, ProfileModal } from "./components/Coach";
import { DiagnosticModal, type DiagnosticOutcome } from "./components/DiagnosticModal";
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
  AnswerLogEntry,
  Course,
  FarmPlot,
  Inventory,
  LearnerProfile,
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
  answers: "gemmagotchi_answers",
  timer: "gemmagotchi_timer",
  bench: "gemmagotchi_pets_bench",
  dew: "gemmagotchi_dew",
  farm: "gemmagotchi_farm",
  profile: "gemmagotchi_profile",
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
  const [pet, setPet] = useState<PetState | null>(() => {
    const p = load<PetState | null>(KEYS.pet, null);
    // Pets predating adoption have no id; give them a stable one.
    return p && !p.id ? { ...p, id: "pet-legacy" } : p;
  });
  /** Adopted pets not currently active. They rest; only the companion decays. */
  const [bench, setBench] = useState<PetState[]>(() => load<PetState[]>(KEYS.bench, []));
  /** Dew: one minute of real study = one minute of water for the farm. */
  const [dew, setDew] = useState<number>(() => load(KEYS.dew, 0));
  const [farm, setFarm] = useState<FarmPlot[]>(() =>
    load<FarmPlot[]>(
      KEYS.farm,
      Array.from({ length: 6 }, (_, id) => ({ id, crop: null, stage: 0 as const, lastWateredDay: null }))
    )
  );
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
  const [answers, setAnswers] = useState<AnswerLogEntry[]>(() => load<AnswerLogEntry[]>(KEYS.answers, []));
  const [profile, setProfile] = useState<LearnerProfile>(() => load<LearnerProfile>(KEYS.profile, DEFAULT_PROFILE));

  const [tab, setTab] = useState<Tab>("today");
  const [activeModule, setActiveModule] = useState<SubLesson | null>(null);
  const [timer, setTimer] = useState<TimerState | null>(() => load<TimerState | null>(KEYS.timer, null));
  const [timerOpen, setTimerOpen] = useState(false);
  const [building, setBuilding] = useState(false);
  const [planProgress, setPlanProgress] = useState<{ current: number; total: number; title: string } | null>(null);
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [clockDays, setClockDays] = useState(() => offsetDays());

  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(0);

  const [addTopicOpen, setAddTopicOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [drillTopic, setDrillTopic] = useState<string | null>(null);
  /** A course request paused for its diagnostic quiz. */
  const [pendingPlan, setPendingPlan] = useState<{
    subject: string;
    examDate: string;
    notes: string;
    files?: string[];
  } | null>(null);
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
  useEffect(() => { localStorage.setItem(KEYS.answers, JSON.stringify(answers)); }, [answers]);
  useEffect(() => { localStorage.setItem(KEYS.bench, JSON.stringify(bench)); }, [bench]);
  useEffect(() => { localStorage.setItem(KEYS.dew, JSON.stringify(dew)); }, [dew]);
  useEffect(() => { localStorage.setItem(KEYS.farm, JSON.stringify(farm)); }, [farm]);
  useEffect(() => {
    // The running pomodoro is real work in progress — it survives everything,
    // including a page reload. Only "End session" removes it.
    if (timer) localStorage.setItem(KEYS.timer, JSON.stringify(timer));
    else localStorage.removeItem(KEYS.timer);
  }, [timer]);
  useEffect(() => { localStorage.setItem(KEYS.profile, JSON.stringify(profile)); }, [profile]);

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

  /**
   * The focus timer ticks in the app, not in its window, so closing the window
   * or changing tab does not throw the session away — the one thing a focus
   * timer must never do.
   */
  useEffect(() => {
    if (!timer?.running) return;
    const id = setInterval(() => {
      setTimer((t) => (t && t.secondsLeft > 0 ? { ...t, secondsLeft: t.secondsLeft - 1 } : t));
    }, 1000);
    return () => clearInterval(id);
  }, [timer?.running]);

  // A finished round pays out, then rolls into a break (or back to work).
  useEffect(() => {
    if (!timer || timer.secondsLeft > 0) return;
    if (timer.phase === "work") {
      completeSprint(timer.minutes);
      setTimer({
        minutes: timer.minutes,
        secondsLeft: BREAK_MINUTES * 60,
        running: true,
        phase: "break",
        rounds: timer.rounds + 1,
      });
    } else {
      setTimer({ ...initialTimer(timer.minutes), rounds: timer.rounds });
      setTimerOpen(true);
    }
  }, [timer?.secondsLeft, timer?.phase]);

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
    async (input: { subject: string; examDate?: string; notes: string; baseline?: string }) => {
      return buildCurriculum({
        notes: input.notes,
        subject: input.subject,
        examDate: input.examDate ?? "",
        minutesPerDay,
        baseline: input.baseline,
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
      baseline?: string;
    }) => {
      const t = now();
      const plan = await planTopicPlan({
        subject: req.subject,
        examDate: req.examDate,
        notes: req.notes,
        baseline: req.baseline,
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

  function addCourse(req: { subject: string; examDate: string; notes: string; files?: string[] }) {
    setPendingPlan(req);
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

  function handleOnboarding(result: OnboardingResult) {
    setLearner({ character: result.character, name: "You" });
    setPet(createPet(result.petName, result.species, now()));
    setMinutesPerDay(result.minutesPerDay);

    // Calibration read: depth is stated, pace is measured, both visible later.
    if (result.calibration) {
      const times = result.calibration.answers.map((a) => a.seconds).sort((x, y) => x - y);
      const median = times.length ? times[Math.floor(times.length / 2)] : null;
      setProfile((p) => ({
        ...p,
        calibratedAt: now(),
        medianAnswerSeconds: median,
        measured: {
          ...p.measured,
          depth: result.calibration!.depthPref,
          pace: paceFromSeconds(median),
        },
      }));
      for (const a of result.calibration.answers) {
        recordAnswer({ topic: "Calibration", kind: "mcq", ...a, context: "calibration" });
      }
    }

    // The diagnostic runs BEFORE planning, so the plan is built around it.
    setPendingPlan({ subject: result.subject, examDate: result.examDate, notes: result.notes });
  }

  /** Diagnostic finished (or skipped) — now actually build the plan. */
  async function handleDiagnosticDone(outcome: DiagnosticOutcome) {
    const req = pendingPlan;
    setPendingPlan(null);
    if (!req) return;
    for (const a of outcome.answers) {
      recordAnswer({ topic: req.subject, kind: a.kind, correct: a.correct, seconds: a.seconds, context: "diagnostic" });
    }
    setBuilding(true);
    try {
      await planCourse({ ...req, baseline: outcome.baseline ?? undefined });
      setTab("plan");
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
   * Record one answered question and re-measure the profile from the log.
   * Overrides are untouched: re-measuring only moves what the learner has not
   * pinned by hand.
   */
  const recordAnswer = useCallback(
    (outcome: {
      topic: string;
      kind: "mcq" | "text";
      correct: boolean;
      seconds: number;
      context: AnswerLogEntry["context"];
    }) => {
      // Computed outside the updaters: a nested setState inside one is the
      // impurity that paid every reward twice before it was caught.
      const next: AnswerLogEntry[] = [
        ...answers,
        {
          ...outcome,
          id: `ans-${Date.now()}-${answers.length}`,
          at: now(),
          courseId: activeCourseId,
        },
      ];
      setAnswers(next);
      setProfile((p) => remeasure(p, next));
    },
    [answers, activeCourseId]
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
    setDew((d) => d + (finished?.durationMins ?? 10));
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

  /** Open the timer, starting a fresh round if none is in flight. */
  function openTimer() {
    setTimer((t) => t ?? initialTimer(minutesPerDay >= 45 ? 45 : minutesPerDay >= 25 ? 25 : 15));
    setTimerOpen(true);
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
    setDew((d) => d + Math.max(1, Math.round(minutes)));
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

    if (reward.id === "lotus") {
      const empty = farm.find((p) => p.stage === 0);
      if (!empty) return;
      setFarm((f) =>
        f.map((p) => (p.id === empty.id ? { ...p, crop: "lotus", stage: 2 as const, lastWateredDay: null } : p))
      );
      setTab("farm");
      return;
    }

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

  /**
   * Adoption: another egg joins the family. The newcomer starts on the bench —
   * the active companion is a relationship, not a slot machine, so switching
   * is always the learner's explicit choice.
   */
  function adoptPet(species: PetSpecies, name: string) {
    if (gems < ADOPTION_COST) return;
    setGems((g) => g - ADOPTION_COST);
    setBench((b) => [...b, createPet(name.trim() || "Newbie", species, now())]);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  }

  /** Swap the active companion with one from the bench. */
  function switchPet(id: string) {
    const next = bench.find((b) => b.id === id);
    if (!next || !pet) return;
    setBench((b) => [...b.filter((x) => x.id !== id), pet]);
    // The incoming pet was resting, not neglected — it wakes at the time it
    // was benched, so it is not punished for the time you spent elsewhere.
    setPet({ ...next, lastStudiedAt: now() });
    setCelebrate((c) => c + 1);
  }

  const virtualToday = Math.floor(now() / 86_400_000);

  function plantCrop(plotId: number, cropId: string) {
    setFarm((f) => f.map((p) => (p.id === plotId ? { ...p, crop: cropId, stage: 1 as const, lastWateredDay: null } : p)));
  }

  function waterPlot(plotId: number) {
    const plot = farm.find((p) => p.id === plotId);
    if (!plot || plot.stage === 0 || plot.stage === 3) return;
    if (plot.lastWateredDay === virtualToday || dew < WATER_COST) return;
    setDew((d) => d - WATER_COST);
    setFarm((f) =>
      f.map((p) =>
        p.id === plotId
          ? { ...p, stage: Math.min(3, p.stage + 1) as FarmPlot["stage"], lastWateredDay: virtualToday }
          : p
      )
    );
  }

  /** Harvest pays the crop's own yield, and feeds the companion's growth. */
  function harvestPlot(plotId: number) {
    const plot = farm.find((p) => p.id === plotId);
    const crop = cropById(plot?.crop ?? null);
    if (!plot || plot.stage !== 3 || !crop || !pet) return;
    setFarm((f) => f.map((p) => (p.id === plotId ? { ...p, crop: null, stage: 0 as const, lastWateredDay: null } : p)));
    setGems((g) => g + crop.gemYield);
    const growth = pet.growth + 1;
    const stage = stageFor(growth);
    if (stage !== pet.stage) confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
    else confetti({ particleCount: 40, spread: 55, origin: { y: 0.6 } });
    setPet({ ...pet, growth, stage });
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

  if (!learner || !pet) {
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
        timer={timer}
        onOpenTimer={openTimer}
        onOpenSocratic={() => setSocraticOpen(true)}
        onOpenGems={() => setGemsOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeModule ? (
          <TutorRoom
            course={course}
            module={activeModule}
            pet={pet}
            hasMasterclass={inventory.owned.includes("masterclass")}
            onAnswered={recordAnswer}
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
                bench={bench}
                dew={dew}
                onSwitchPet={switchPet}
                onOpenFarm={() => setTab("farm")}
                coach={
                  <CoachCard
                    answers={answers}
                    studyLog={studyLog}
                    profile={profile}
                    subject={course?.subject}
                    onOpenProfile={() => setProfileOpen(true)}
                    onDrillTopic={(t) => {
                      setDrillTopic(t);
                      setTab("drills");
                    }}
                  />
                }
                onOpenTrajectory={() => setTab("trajectory")}
                onStartLesson={() => nextModule && setActiveModule(nextModule)}
                onStartSprint={openTimer}
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
                weakByTopic={Object.fromEntries(
                  weakTopics(answers).map((w) => [w.topic, Math.round(w.accuracy * 100)])
                )}
                onDrillTopic={(t) => {
                  setDrillTopic(t);
                  setTab("drills");
                }}
                onStart={setActiveModule}
                onAddTopic={() => setAddTopicOpen(true)}
                onBigReview={() => setTab("drills")}
              />
            )}
            {tab === "drills" && (
              <DrillsView
                course={course}
                autoStartTopic={drillTopic}
                onAutoStarted={() => setDrillTopic(null)}
                hasMasterclass={inventory.owned.includes("masterclass")}
                onCorrect={handleCorrect}
                onAnswered={recordAnswer}
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
            {tab === "farm" && (
              <FarmView
                plots={farm}
                dew={dew}
                gems={gems}
                pet={pet}
                bench={bench}
                today={virtualToday}
                onPlant={plantCrop}
                onWater={waterPlot}
                onHarvest={harvestPlot}
              />
            )}
            {tab === "store" && (
              <StoreView
                gems={gems}
                pet={pet}
                bench={bench}
                inventory={inventory}
                adoptionCost={ADOPTION_COST}
                onBuy={buyFood}
                onFeed={useFood}
                onAdopt={adoptPet}
              />
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

      {timerOpen && timer && (
        <FocusTimer
          timer={timer}
          setTimer={setTimer as React.Dispatch<React.SetStateAction<TimerState>>}
          pet={pet}
          subject={course?.subject}
          nudge={nudge}
          nudgeLoading={nudgeLoading}
          onRescue={openRescue}
          onMinimise={() => setTimerOpen(false)}
          onClose={() => {
            setTimerOpen(false);
            setTimer(null);
          }}
        />
      )}

      {pendingPlan && (
        <DiagnosticModal
          subject={pendingPlan.subject}
          notes={pendingPlan.notes}
          onDone={handleDiagnosticDone}
        />
      )}

      {profileOpen && (
        <ProfileModal profile={profile} onChange={setProfile} onClose={() => setProfileOpen(false)} />
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
