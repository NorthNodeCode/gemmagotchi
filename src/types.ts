import type { PetState } from "./lib/petState";
import type { PetSpecies } from "./lib/sprites";

export type { PetState, PetSpecies };
export type { PetStage, PetMood } from "./lib/petState";

export interface Learner {
  /** Which character sprite represents the learner. 1..8 */
  character: number;
  name: string;
}

export interface CheckQuestion {
  id: string;
  kind: "mcq" | "text";
  question: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  modelAnswer?: string;
}

export interface SubLesson {
  id: string;
  title: string;
  description: string;
  durationMins: number;
  keyTakeaway?: string;
  sourceExcerpt?: string;
  completed: boolean;
}

/**
 * A week's worth of a module — one lecture, or a couple covering one theme.
 * This is the unit a student actually thinks in ("week 4 was Fourier"), and
 * it is what gets planned, taught and revised as a block.
 */
export interface Topic {
  id: string;
  title: string;
  /** Teaching week. Ordering everywhere is by this, not by array position. */
  week: number;
  /** This topic's own material — its lectures, not the whole course's. */
  notes: string;
  /** Display names of the lecture files this topic was built from. */
  files: string[];
  modules: SubLesson[];
  /** Set while its plan is still being generated. */
  planning?: boolean;
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  description: string;
  examDate?: string;
  estimatedWeeks: number;
  topics: Topic[];
  /** @deprecated Pre-topics shape; migrated into `topics` on load. */
  notes?: string;
  /** @deprecated Pre-topics shape; migrated into `topics` on load. */
  modules?: SubLesson[];
}

export interface LessonPayload {
  lesson: string;
  questions: CheckQuestion[];
}

export interface GradeResult {
  verdict: "correct" | "partial" | "incorrect";
  feedback: string;
  missedPoint?: string | null;
}

export interface Nudge {
  nudge: string;
  tone: "welcoming" | "encouraging" | "celebratory" | "sleepy";
  actionItem: string;
  petReaction: string;
}

export interface RescuePayload {
  rescueTitle: string;
  microChallenge: string;
  quickQuestion?: { question: string; options: string[]; correctIndex: number };
  encouragement: string;
}

export interface TrajectoryPoint {
  week: string;
  consistentMastery: number;
  driftingMastery: number;
  petHealthConsistent: number;
  petHealthDrifting: number;
}

export interface TrajectoryForecast {
  summaryText: string;
  forecastData: TrajectoryPoint[];
  outcomes: { ifConsistent: string; ifDrifting: string };
}

export interface Inventory {
  /** Cosmetic ids the learner owns. */
  owned: string[];
  /** Food id -> quantity held. */
  food: Record<string, number>;
}

export interface StudyLogEntry {
  id: string;
  at: number;
  label: string;
  gems: number;
  wasComeback: boolean;
  /** Minutes of study this entry represents — sums into total focus time. */
  durationMins: number;
  kind: "lesson" | "sprint" | "rescue" | "drill";
}

/** One answered question, wherever it was answered. The coach reads these. */
export interface AnswerLogEntry {
  id: string;
  at: number;
  courseId: string | null;
  /** The week/topic this question belonged to — what weak points key on. */
  topic: string;
  kind: "mcq" | "text";
  correct: boolean;
  /** Seconds from seeing the question to resolving it. */
  seconds: number;
  context: "lesson" | "drill" | "diagnostic" | "calibration";
}

export type Level = "low" | "medium" | "high";

export interface LearnerLevels {
  /** How deep lessons go. */
  depth: Level;
  /** How dense the plan is — driven by answer speed. */
  pace: Level;
  /** How hard the questions push — driven by accuracy. */
  challenge: Level;
}

/**
 * What the app believes about how this learner learns. `measured` comes from
 * the calibration test and ongoing behaviour; `overrides` is the learner
 * disagreeing, and always wins — the model serves the person, not the reverse.
 */
export interface LearnerProfile {
  measured: LearnerLevels;
  overrides: Partial<LearnerLevels>;
  medianAnswerSeconds: number | null;
  calibratedAt: number | null;
}

export interface CoachWeakPoint {
  topic: string;
  evidence: string;
  suggestion: string;
}

export interface CoachReport {
  read: string;
  observations: string[];
  weakPoints: CoachWeakPoint[];
  suggestedLevels: Partial<LearnerLevels>;
  nextBestAction: string;
}

export interface FarmPlot {
  id: number;
  crop: string | null;
  /** 0 empty, 1 sprout, 2 growing, 3 ready to harvest. */
  stage: 0 | 1 | 2 | 3;
  /** Virtual day this plot was last watered — one watering per day per plot. */
  lastWateredDay: number | null;
}

export interface ProviderInfo {
  provider: string;
  model: string;
  ready: boolean;
  hosted: string;
  local: string;
}
