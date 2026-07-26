import type {
  AnswerLogEntry,
  Level,
  LearnerLevels,
  LearnerProfile,
  StudyLogEntry,
} from "../types";

/**
 * The learner model: everything the coach knows, computed from two logs.
 *
 * All pure functions over the answer log and study log — nothing here calls a
 * model or touches the network. The point is that the evidence is legible: any
 * number the coach cites can be recomputed by hand from what is on disk.
 */

export const DEFAULT_PROFILE: LearnerProfile = {
  measured: { depth: "medium", pace: "medium", challenge: "medium" },
  overrides: {},
  medianAnswerSeconds: null,
  calibratedAt: null,
};

/** What actually applies: the learner's override always beats the measurement. */
export function effectiveLevels(profile: LearnerProfile): LearnerLevels {
  return { ...profile.measured, ...profile.overrides };
}

/**
 * The levels as persisted right now. Read straight from storage so request
 * helpers can attach them without every component threading the profile.
 */
export function currentLevels(): LearnerLevels {
  try {
    const raw = localStorage.getItem("gemmagotchi_profile");
    if (!raw) return DEFAULT_PROFILE.measured;
    return effectiveLevels(JSON.parse(raw) as LearnerProfile);
  } catch {
    return DEFAULT_PROFILE.measured;
  }
}

// ---------------------------------------------------------------------------
// Level inference
// ---------------------------------------------------------------------------

/** Under 20s a question reads as quick; over 40s as deliberate. Both are fine. */
export function paceFromSeconds(median: number | null): Level {
  if (median == null) return "medium";
  if (median < 20) return "high";
  if (median < 40) return "medium";
  return "low";
}

/**
 * Challenge follows the recent hit rate: cruising above 80% means the
 * questions are too easy to be teaching anything; below 40% they are a wall.
 */
export function challengeFromAccuracy(answers: AnswerLogEntry[]): Level {
  const recent = answers.filter((a) => a.context !== "calibration").slice(-10);
  if (recent.length < 4) return "medium";
  const rate = recent.filter((a) => a.correct).length / recent.length;
  if (rate > 0.8) return "high";
  if (rate < 0.4) return "low";
  return "medium";
}

export function medianSeconds(answers: AnswerLogEntry[]): number | null {
  const times = answers.map((a) => a.seconds).filter((s) => s > 0 && s < 600);
  if (!times.length) return null;
  const sorted = [...times].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Re-measure pace and challenge from the log; depth only moves by hand. */
export function remeasure(profile: LearnerProfile, answers: AnswerLogEntry[]): LearnerProfile {
  const median = medianSeconds(answers);
  return {
    ...profile,
    medianAnswerSeconds: median,
    measured: {
      ...profile.measured,
      pace: paceFromSeconds(median),
      challenge: challengeFromAccuracy(answers),
    },
  };
}

// ---------------------------------------------------------------------------
// Weak points
// ---------------------------------------------------------------------------

export interface TopicAccuracy {
  topic: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

export function topicAccuracies(answers: AnswerLogEntry[]): TopicAccuracy[] {
  const byTopic = new Map<string, { attempts: number; correct: number }>();
  for (const a of answers) {
    if (a.context === "calibration") continue;
    const t = byTopic.get(a.topic) ?? { attempts: 0, correct: 0 };
    t.attempts += 1;
    if (a.correct) t.correct += 1;
    byTopic.set(a.topic, t);
  }
  return [...byTopic.entries()]
    .map(([topic, t]) => ({ topic, ...t, accuracy: t.correct / t.attempts }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

/**
 * A topic is weak when it has been genuinely tried and mostly missed. One
 * wrong answer is noise; two attempts below 60% is a signal.
 */
export function weakTopics(answers: AnswerLogEntry[]): TopicAccuracy[] {
  return topicAccuracies(answers).filter((t) => t.attempts >= 2 && t.accuracy < 0.6);
}

// ---------------------------------------------------------------------------
// Behaviour summary — what the coach is shown
// ---------------------------------------------------------------------------

export interface CoachEvidence {
  totalAnswers: number;
  recentAccuracyPct: number | null;
  medianAnswerSeconds: number | null;
  weakTopics: TopicAccuracy[];
  strongTopics: TopicAccuracy[];
  sessionMix: Record<string, number>;
  comebacks: number;
  rescues: number;
  totalFocusMins: number;
}

export function coachEvidence(
  answers: AnswerLogEntry[],
  studyLog: StudyLogEntry[]
): CoachEvidence {
  const real = answers.filter((a) => a.context !== "calibration");
  const recent = real.slice(-10);
  const acc = topicAccuracies(answers);

  const mix: Record<string, number> = {};
  for (const e of studyLog) mix[e.kind] = (mix[e.kind] ?? 0) + 1;

  return {
    totalAnswers: real.length,
    recentAccuracyPct: recent.length
      ? Math.round((recent.filter((a) => a.correct).length / recent.length) * 100)
      : null,
    medianAnswerSeconds: medianSeconds(answers),
    weakTopics: weakTopics(answers).slice(0, 3),
    strongTopics: acc.filter((t) => t.attempts >= 2 && t.accuracy >= 0.8).slice(-3).reverse(),
    sessionMix: mix,
    comebacks: studyLog.filter((e) => e.wasComeback).length,
    rescues: studyLog.filter((e) => e.kind === "rescue").length,
    totalFocusMins: Math.round(studyLog.reduce((s, e) => s + (e.durationMins ?? 0), 0)),
  };
}

/**
 * The coach's read without any model at all — the same evidence, templated.
 * Used offline, and as the instant text while the real coach is thinking.
 */
export function localCoachRead(evidence: CoachEvidence, levels: LearnerLevels): string {
  if (evidence.totalAnswers === 0) {
    return "No answers on record yet. The first few questions you take — right or wrong — are what teach me how you learn.";
  }
  const bits: string[] = [];
  if (evidence.recentAccuracyPct != null) {
    bits.push(`You're landing ${evidence.recentAccuracyPct}% of recent questions`);
  }
  if (evidence.medianAnswerSeconds != null) {
    bits.push(
      evidence.medianAnswerSeconds < 20
        ? `answering quickly (~${evidence.medianAnswerSeconds}s)`
        : `taking your time (~${evidence.medianAnswerSeconds}s a question), which suits deeper material`
    );
  }
  if (evidence.weakTopics.length) {
    bits.push(`the clearest gap is ${evidence.weakTopics[0].topic}`);
  }
  return bits.length
    ? `${bits.join("; ")}. Depth is set to ${levels.depth}, challenge to ${levels.challenge}.`
    : "Keep answering — the picture sharpens with every question.";
}
