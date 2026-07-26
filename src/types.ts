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

export interface Course {
  id: string;
  title: string;
  subject: string;
  description: string;
  examDate?: string;
  /** The learner's own pasted material — everything is taught from this. */
  notes: string;
  estimatedWeeks: number;
  modules: SubLesson[];
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

export interface ProviderInfo {
  provider: string;
  model: string;
  ready: boolean;
  hosted: string;
  local: string;
}
