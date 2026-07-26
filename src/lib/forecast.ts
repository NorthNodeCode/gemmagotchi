import type { TrajectoryPoint } from "../types";

/**
 * The four-week forecast, computed locally.
 *
 * The model is not asked for these numbers on purpose. The learner drags a
 * slider and expects the curve to answer immediately — a round trip to a
 * laptop-sized model would put seconds between the gesture and the response,
 * and a forecast that lags is a forecast nobody plays with. Gemma is asked for
 * the words instead, which is what it is actually better at.
 *
 * The curve is a saturating one: each week of practice closes a fixed fraction
 * of the remaining gap to mastery, so early weeks move fast and later ones
 * grind. That matches how revision actually feels, and it means the difference
 * between schedules compounds rather than staying parallel.
 */

/** Tuned so 25 min/day with no skipped days reaches ~95% by week four. */
const RATE_CONSTANT = 0.0042;

export interface ForecastInputs {
  dailyMinutes: number;
  skippedDaysPerWeek: number;
}

export function weeklyForecast({
  dailyMinutes,
  skippedDaysPerWeek,
}: ForecastInputs): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];

  // Drifting is not a different person — it is the same person on a worse
  // schedule: shorter sessions and more days missed.
  const driftMinutes = Math.max(5, Math.round(dailyMinutes * 0.4));
  const driftSkips = Math.min(6, skippedDaysPerWeek + 2);

  let steady = 0;
  let drifting = 0;

  for (let week = 1; week <= 4; week++) {
    steady = advance(steady, dailyMinutes, skippedDaysPerWeek);
    drifting = advance(drifting, driftMinutes, driftSkips);

    points.push({
      week: `Week ${week}`,
      consistentMastery: Math.round(steady),
      driftingMastery: Math.round(drifting),
      petHealthConsistent: Math.round(petHealth(skippedDaysPerWeek, week)),
      petHealthDrifting: Math.round(petHealth(driftSkips, week)),
    });
  }

  return points;
}

/** One week of practice closes a share of the gap left to full mastery. */
function advance(current: number, minutes: number, skips: number): number {
  const daysStudied = Math.max(0, 7 - skips);
  const weeklyMinutes = minutes * daysStudied;
  const gain = (100 - current) * (1 - Math.exp(-RATE_CONSTANT * weeklyMinutes));
  return Math.min(100, current + gain);
}

/**
 * The companion's energy over the same weeks. It floors at 15 for the same
 * reason it does in the real decay engine: the pet is never lost, so the chart
 * never threatens the learner with losing it.
 */
function petHealth(skips: number, week: number): number {
  if (skips === 0) return Math.min(100, 92 + week * 2);
  return Math.max(15, 95 - skips * 11 * (week * 0.55));
}

/** A plain-language read of the gap, used until Gemma's version arrives. */
export function localSummary(points: TrajectoryPoint[], inputs: ForecastInputs): string {
  const last = points[points.length - 1];
  const gap = last.consistentMastery - last.driftingMastery;
  const days = 7 - inputs.skippedDaysPerWeek;

  if (inputs.skippedDaysPerWeek === 0) {
    return `${inputs.dailyMinutes} minutes every day gets you to about ${last.consistentMastery}% in four weeks. Even this schedule slipping to a few days a week costs you roughly ${gap} points of that.`;
  }
  return `${inputs.dailyMinutes} minutes on ${days} ${days === 1 ? "day" : "days"} a week reaches about ${last.consistentMastery}% by week four — around ${gap} points ahead of where the same month goes if the sessions get shorter and the gaps get longer.`;
}
