/**
 * Client wrappers for the Gemma 4 endpoints.
 *
 * Every call degrades to something usable if the model is unreachable, because
 * a study companion that goes blank when the network hiccups is a companion
 * that gets uninstalled.
 */

import type {
  CheckQuestion,
  Course,
  GradeResult,
  Nudge,
  PetState,
  ProviderInfo,
  RescuePayload,
  SubLesson,
  TrajectoryForecast,
} from "../types";
import { daysBetween, moodFor } from "../lib/petState";
import { now } from "../lib/clock";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return (await res.json()) as T;
}

/** The pet context every pet-voiced endpoint needs. */
function petContext(pet: PetState) {
  const daysSinceStudy = daysBetween(pet.lastStudiedAt, now());
  return {
    name: pet.name,
    species: pet.species,
    stage: pet.stage,
    mood: moodFor(pet.health),
    health: pet.health,
    daysSinceStudy,
    streak: pet.streak,
    isComeback: daysSinceStudy > 1,
  };
}

export async function fetchProvider(): Promise<ProviderInfo | null> {
  try {
    const res = await fetch("/api/provider");
    if (!res.ok) return null;
    return (await res.json()) as ProviderInfo;
  } catch {
    return null;
  }
}

export async function buildCurriculum(input: {
  notes: string;
  subject: string;
  examDate?: string;
  minutesPerDay?: number;
}): Promise<Pick<Course, "title" | "description" | "estimatedWeeks"> & { modules: SubLesson[] }> {
  const data = await post<any>("/api/ai/curriculum", input);
  return {
    title: data.title || input.subject,
    description: data.description || "",
    estimatedWeeks: data.estimatedWeeks || 2,
    modules: (data.modules || []).map((m: any, i: number) => ({
      id: m.id || `mod-${i + 1}`,
      title: m.title || `Part ${i + 1}`,
      description: m.description || "",
      durationMins: m.durationMins || 15,
      keyTakeaway: m.keyTakeaway,
      sourceExcerpt: m.sourceExcerpt,
      completed: false,
    })),
  };
}

export interface LessonInput {
  moduleTitle: string;
  sourceExcerpt?: string;
  notes: string;
  subject: string;
  previousLessons?: string[];
}

/** The teaching prose. Requested first so reading can start immediately. */
export async function fetchLesson(input: LessonInput): Promise<string> {
  const data = await post<any>("/api/ai/lesson", input);
  return data.lesson || "";
}

/** The check questions, fetched while the learner reads the lesson. */
export async function fetchChecks(input: LessonInput): Promise<CheckQuestion[]> {
  const data = await post<any>("/api/ai/checks", input);
  return (data.questions || []).map((q: any, i: number) => ({
    id: q.id || `q${i + 1}`,
    kind: q.kind === "text" ? "text" : "mcq",
    question: q.question || "",
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    modelAnswer: q.modelAnswer,
  }));
}

/**
 * Warm the cache for the lesson the learner is most likely to open next, so
 * pressing Start feels immediate. Only the prose is warmed: a local model
 * serves one request at a time, so queueing the questions too would just delay
 * the thing the learner is actually waiting for.
 */
export function prefetchLesson(input: LessonInput): void {
  void fetchLesson(input).catch(() => {});
}

export async function gradeAnswer(input: {
  question: string;
  modelAnswer?: string;
  learnerAnswer: string;
  subject: string;
}): Promise<GradeResult> {
  try {
    return await post<GradeResult>("/api/ai/grade", input);
  } catch {
    return {
      verdict: "partial",
      feedback: "Could not reach the tutor to mark this one — compare against the model answer and carry on.",
      missedPoint: null,
    };
  }
}

export async function fetchNudge(input: {
  pet: PetState;
  subject?: string;
  nextStep?: string;
}): Promise<Nudge> {
  try {
    return await post<Nudge>("/api/ai/nudge", {
      pet: petContext(input.pet),
      subject: input.subject,
      nextStep: input.nextStep,
    });
  } catch {
    const ctx = petContext(input.pet);
    return ctx.isComeback
      ? {
          nudge: `${ctx.name} perks right up when you appear. Good to see you!`,
          tone: "welcoming",
          actionItem: "One quick question to warm up — that's all.",
          petReaction: `${ctx.name} bounds over to you`,
        }
      : {
          nudge: `${ctx.name} is ready when you are.`,
          tone: "encouraging",
          actionItem: "Start the next sub-lesson, it's a short one.",
          petReaction: `${ctx.name} watches you hopefully`,
        };
  }
}

export async function fetchRescue(input: {
  pet: PetState;
  subject?: string;
  feeling?: string;
}): Promise<RescuePayload> {
  try {
    return await post<RescuePayload>("/api/ai/rescue", {
      pet: petContext(input.pet),
      subject: input.subject,
      feeling: input.feeling,
    });
  } catch {
    return {
      rescueTitle: "The two-minute restart",
      microChallenge: `Write down two things you already remember about ${input.subject || "your topic"}. That's the whole task.`,
      quickQuestion: {
        question: "What size of first step works best when starting feels hard?",
        options: ["The smallest one you won't refuse", "A three-hour block", "Wait for motivation"],
        correctIndex: 0,
      },
      encouragement: `${input.pet.name} is just glad you're here.`,
    };
  }
}

export async function fetchTrajectory(input: {
  subject?: string;
  minutesPerDay: number;
  streak: number;
  daysSinceStudy: number;
}): Promise<TrajectoryForecast> {
  return post<TrajectoryForecast>("/api/ai/trajectory", input);
}
