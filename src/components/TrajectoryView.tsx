import React, { useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Calendar, Clock, Loader2, TrendingUp } from "lucide-react";
import { fetchTrajectory } from "../services/api";
import { daysBetween } from "../lib/petState";
import { localSummary, weeklyForecast } from "../lib/forecast";
import { now } from "../lib/clock";
import type { PetState, TrajectoryForecast } from "../types";

/**
 * Four weeks ahead, two ways.
 *
 * Framed as a consequence of a schedule rather than a verdict on the person —
 * the drifting line is what a calendar produces, not evidence of a character
 * flaw. Making it feel like the latter is what drives avoidance.
 *
 * The curve is computed locally so dragging a slider answers instantly, even
 * with no model reachable at all. Gemma is asked for the prose, on a debounce,
 * and the chart never waits for it.
 */

const PRESETS = [
  { label: "🌱 Every day", minutes: 25, skips: 0 },
  { label: "⚠️ Most weeks", minutes: 15, skips: 2 },
  { label: "🛑 Drifting", minutes: 5, skips: 5 },
];

export const TrajectoryView: React.FC<{
  pet: PetState;
  subject?: string;
  minutesPerDay: number;
}> = ({ pet, subject, minutesPerDay }) => {
  const [dailyMinutes, setDailyMinutes] = useState(minutesPerDay);
  const [skips, setSkips] = useState(1);
  const [words, setWords] = useState<TrajectoryForecast | null>(null);
  const [wordsLoading, setWordsLoading] = useState(false);

  const points = useMemo(
    () => weeklyForecast({ dailyMinutes, skippedDaysPerWeek: skips }),
    [dailyMinutes, skips]
  );

  // Gemma writes the interpretation, debounced so a slider drag is one request.
  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(() => {
      setWordsLoading(true);
      fetchTrajectory({
        subject,
        minutesPerDay: dailyMinutes,
        streak: pet.streak,
        daysSinceStudy: daysBetween(pet.lastStudiedAt, now()),
      })
        .then((d) => !cancelled && setWords(d))
        .catch(() => {})
        .finally(() => !cancelled && setWordsLoading(false));
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [subject, dailyMinutes, skips]);

  const summary = words?.summaryText ?? localSummary(points, { dailyMinutes, skippedDaysPerWeek: skips });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#5E7161]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A837C]">
            Four weeks from now
          </span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-serif text-2xl font-bold">Where each path leads</h2>
          <div className="flex gap-1.5">
            {PRESETS.map((p) => {
              const active = dailyMinutes === p.minutes && skips === p.skips;
              return (
                <button
                  key={p.label}
                  onClick={() => {
                    setDailyMinutes(p.minutes);
                    setSkips(p.skips);
                  }}
                  className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition-all ${
                    active
                      ? "border-[#5E7161] bg-[#5E7161] text-white"
                      : "border-[#E5E2D9] bg-[#FDFCF8] text-[#7A837C] hover:border-[#8BA88E]"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Move these and the chart answers immediately — no model in the loop. */}
        <div className="mt-5 grid gap-4 rounded-2xl border border-[#E5E2D9] bg-[#F5F2EA] p-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#7A837C]">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Minutes a day
              </span>
              <span className="font-bold text-[#5E7161]">{dailyMinutes} min</span>
            </span>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={dailyMinutes}
              onChange={(e) => setDailyMinutes(Number(e.target.value))}
              className="w-full accent-[#5E7161]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#7A837C]">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Days skipped a week
              </span>
              <span className={skips > 2 ? "font-bold text-[#B85B56]" : "font-bold text-[#5E7161]"}>
                {skips} {skips === 1 ? "day" : "days"}
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={6}
              step={1}
              value={skips}
              onChange={(e) => setSkips(Number(e.target.value))}
              className="w-full accent-[#B85B56]"
            />
          </label>
        </div>

        <div className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-[#2D362E]">
          {wordsLoading && <Loader2 className="mt-1 h-3.5 w-3.5 shrink-0 animate-spin text-[#7A837C]" />}
          <p>{summary}</p>
        </div>

        <div className="mt-5 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="#E5E2D9" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "#7A837C" }}
                axisLine={{ stroke: "#E5E2D9" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#7A837C" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 14,
                  border: "1px solid #E5E2D9",
                  fontSize: 12,
                  background: "#FDFCF8",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="consistentMastery"
                name="Mastery — this schedule"
                stroke="#5E7161"
                strokeWidth={3}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="driftingMastery"
                name="Mastery — if it slips"
                stroke="#B85B56"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="petHealthConsistent"
                name={`${pet.name}'s energy`}
                stroke="#8BA88E"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="petHealthDrifting"
                name={`${pet.name}'s energy — if it slips`}
                stroke="#D97706"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#8BA88E]/40 bg-[#F0F4F0] p-4">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#5E7161]">
              If you keep going
            </div>
            <p className="text-sm text-[#2D362E]">
              {words?.outcomes.ifConsistent ??
                `About ${points[3].consistentMastery}% of this material solid, and ${pet.name} thriving the whole way.`}
            </p>
          </div>
          <div className="rounded-2xl border border-[#E5E2D9] bg-[#F5F2EA] p-4">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#7A837C]">
              If the schedule slips
            </div>
            <p className="text-sm text-[#2D362E]">
              {words?.outcomes.ifDrifting ??
                `Closer to ${points[3].driftingMastery}%. Not a disaster, and not a verdict on you — just what a thinner calendar produces.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
