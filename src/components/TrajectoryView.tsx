import React, { useEffect, useState } from "react";
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
import { Loader2, TrendingUp } from "lucide-react";
import { fetchTrajectory } from "../services/api";
import { daysBetween } from "../lib/petState";
import { now } from "../lib/clock";
import type { PetState, TrajectoryForecast } from "../types";

/**
 * Four weeks ahead, two ways.
 *
 * Framed as a consequence of a schedule rather than a verdict on the person —
 * the drifting line is what a calendar produces, not evidence of a character
 * flaw. Making it feel like the latter is what drives avoidance.
 */
export const TrajectoryView: React.FC<{ pet: PetState; subject?: string; minutesPerDay: number }> = ({
  pet,
  subject,
  minutesPerDay,
}) => {
  const [data, setData] = useState<TrajectoryForecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTrajectory({
      subject,
      minutesPerDay,
      streak: pet.streak,
      daysSinceStudy: daysBetween(pet.lastStudiedAt, now()),
    })
      .then((d) => !cancelled && setData(d))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [subject, minutesPerDay]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#5E7161]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A837C]">
            Four weeks from now
          </span>
        </div>
        <h2 className="font-serif text-2xl font-bold">Where each path leads</h2>

        {loading ? (
          <div className="flex items-center gap-2 py-16 text-sm text-[#7A837C]">
            <Loader2 className="h-4 w-4 animate-spin" /> Gemma 4 is projecting your trajectory…
          </div>
        ) : data ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-[#2D362E]">{data.summaryText}</p>

            <div className="mt-6 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.forecastData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
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
                    name="Steady practice"
                    stroke="#5E7161"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="driftingMastery"
                    name="Drifting"
                    stroke="#C89B7B"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#8BA88E]/40 bg-[#F0F4F0] p-4">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#5E7161]">
                  If you keep going
                </div>
                <p className="text-sm text-[#2D362E]">{data.outcomes.ifConsistent}</p>
              </div>
              <div className="rounded-2xl border border-[#E5E2D9] bg-[#F5F2EA] p-4">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#7A837C]">
                  If the schedule slips
                </div>
                <p className="text-sm text-[#2D362E]">{data.outcomes.ifDrifting}</p>
              </div>
            </div>
          </>
        ) : (
          <p className="py-10 text-center text-sm text-[#7A837C]">Could not load a forecast.</p>
        )}
      </div>
    </div>
  );
};
