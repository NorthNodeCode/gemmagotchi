/**
 * The accountability engine.
 *
 * Design constraint that drives all of this: shame makes procrastination
 * worse, not better (Wohl, Pychyl & Bennett 2010; Sirois & Pychyl 2013). So
 * the pet's state can droop, but the rules are deliberately forgiving:
 *
 *   - decay is slow and floors well above "dead" — the pet is never lost
 *   - a streak survives one missed day, so one bad day is not a reset
 *   - coming back after a gap pays a BONUS that scales with the gap
 *
 * The last rule is the important one. Most streak apps punish the return,
 * which is precisely when the learner is most fragile. Here, the longer you
 * were away, the warmer the welcome.
 */

import type { PetSpecies } from "./sprites";

export type PetStage = "egg" | "baby" | "adult";
export type PetMood = "thriving" | "content" | "sleepy" | "hungry";

export interface PetState {
  name: string;
  species: PetSpecies;
  stage: PetStage;
  /** Correct answers and finished sessions push this up; it drives growth. */
  growth: number;
  health: number;
  xp: number;
  level: number;
  /** Virtual-time timestamp of the last completed study action. */
  lastStudiedAt: number;
  streak: number;
  /** Set when the learner returns after a gap, so the UI can celebrate. */
  pendingComeback: number;
}

export const GROWTH_TO_HATCH = 3;
export const GROWTH_TO_ADULT = 12;

export function createPet(name: string, species: PetSpecies, now: number): PetState {
  return {
    name,
    species,
    stage: "egg",
    growth: 0,
    health: 100,
    xp: 0,
    level: 1,
    lastStudiedAt: now,
    streak: 0,
    pendingComeback: 0,
  };
}

export function stageFor(growth: number): PetStage {
  if (growth >= GROWTH_TO_ADULT) return "adult";
  if (growth >= GROWTH_TO_HATCH) return "baby";
  return "egg";
}

export function moodFor(health: number): PetMood {
  if (health >= 80) return "thriving";
  if (health >= 55) return "content";
  if (health >= 30) return "hungry";
  return "sleepy";
}

/** Whole days between two virtual timestamps. */
export function daysBetween(from: number, to: number): number {
  return Math.max(0, Math.floor((to - from) / 86_400_000));
}

/**
 * Health lost per day away. Gentle on purpose, and it never drops the pet
 * below `HEALTH_FLOOR` — neglect makes the pet sleepy, never doomed. Removing
 * the possibility of losing the pet removes the dread that makes people avoid
 * opening the app at all.
 */
const DECAY_PER_DAY = 12;
const HEALTH_FLOOR = 15;
/** A streak survives one missed day. Everyone has an off day. */
export const GRACE_DAYS = 1;

export function applyDecay(pet: PetState, now: number): PetState {
  const away = daysBetween(pet.lastStudiedAt, now);
  if (away <= 0) return pet;

  const health = Math.max(HEALTH_FLOOR, pet.health - away * DECAY_PER_DAY);
  const streak = away > GRACE_DAYS ? 0 : pet.streak;

  return { ...pet, health, streak, pendingComeback: away > GRACE_DAYS ? away : pet.pendingComeback };
}

export interface StudyReward {
  pet: PetState;
  gems: number;
  hatched: boolean;
  grewUp: boolean;
  comebackDays: number;
}

/**
 * Record a completed study action. `weight` is how much it counts: a graded
 * correct answer is 1, a finished lesson is 2, a rescue micro-task is 1.
 */
export function recordStudy(
  pet: PetState,
  now: number,
  weight: number,
  baseGems: number
): StudyReward {
  const away = daysBetween(pet.lastStudiedAt, now);
  const isComeback = away > GRACE_DAYS;

  // The comeback bonus: the longer the gap, the bigger the welcome. Capped so
  // it stays a warm gesture rather than an exploit.
  const comebackBonus = isComeback ? Math.min(50, 10 * away) : 0;

  const beforeStage = pet.stage;
  const growth = pet.growth + weight;
  const stage = stageFor(growth);

  const health = Math.min(100, pet.health + weight * 8 + (isComeback ? 25 : 0));
  const xp = pet.xp + weight * 10 + comebackBonus;
  const level = 1 + Math.floor(xp / 100);

  // Streak increments once per virtual day, and a comeback restarts it at 1.
  const streak = away === 0 ? Math.max(1, pet.streak) : isComeback ? 1 : pet.streak + 1;

  return {
    pet: {
      ...pet,
      growth,
      stage,
      health,
      xp,
      level,
      streak,
      lastStudiedAt: now,
      pendingComeback: 0,
    },
    gems: baseGems + comebackBonus,
    hatched: beforeStage === "egg" && stage === "baby",
    grewUp: beforeStage === "baby" && stage === "adult",
    comebackDays: isComeback ? away : 0,
  };
}

export function feedPet(pet: PetState, health: number): PetState {
  return { ...pet, health: Math.min(100, pet.health + health) };
}

/** Progress towards the next life stage, as a 0..1 fraction. */
export function growthProgress(pet: PetState): number {
  if (pet.stage === "adult") return 1;
  const target = pet.stage === "egg" ? GROWTH_TO_HATCH : GROWTH_TO_ADULT;
  const floor = pet.stage === "egg" ? 0 : GROWTH_TO_HATCH;
  return Math.min(1, (pet.growth - floor) / (target - floor));
}
