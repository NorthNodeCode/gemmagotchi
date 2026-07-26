import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { TrajectoryForecast, Course } from '../types';
import { fetchTrajectoryForecast } from '../services/api';
import { TrendingUp, ShieldAlert, Sparkles, Calendar, Clock, RefreshCw } from 'lucide-react';

interface TrajectorySimulatorProps {
  currentCourse: Course | null;
  streak: number;
  lastStudiedMinsAgo?: number;
}

export const TrajectorySimulator: React.FC<TrajectorySimulatorProps> = ({
  currentCourse,
  streak,
}) => {
  const [dailyMinutes, setDailyMinutes] = useState<number>(25);
  const [skipDaysWeek, setSkipDaysWeek] = useState<number>(1);
  const [forecast, setForecast] = useState<TrajectoryForecast | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadForecast = async () => {
    setIsLoading(true);
    const courseTitle = currentCourse ? currentCourse.title : 'Quantum Computing & AI';
    const data = await fetchTrajectoryForecast({
      currentCourse: courseTitle,
      averageMinsPerDay: dailyMinutes,
      skippedDaysCount: skipDaysWeek,
      streak,
    });
    setForecast(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadForecast();
  }, [currentCourse, dailyMinutes, skipDaysWeek, streak]);

  return (
    <div className="bg-white border border-[#E5E2D9] rounded-3xl p-6 shadow-sm relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#5E7161]" />
            <h3 className="text-xl font-serif font-bold text-[#2D362E]">Future Learning Trajectory Simulator</h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#8BA88E]/20 border border-[#8BA88E]/40 text-[#5E7161] uppercase tracking-wider">
              Gemma 4 Predictive Model
            </span>
          </div>
          <p className="text-xs text-[#7A837C] mt-1">
            Simulates your 30-day course mastery velocity & Spirit Pet health based on your daily commitment vs. procrastination habits.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setDailyMinutes(25); setSkipDaysWeek(0); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              dailyMinutes === 25 && skipDaysWeek === 0
                ? 'bg-[#5E7161] text-white border-[#5E7161] shadow-2xs'
                : 'bg-[#F5F2EA] border-[#E5E2D9] text-[#7A837C] hover:text-[#2D362E]'
            }`}
          >
            🌱 Unstoppable (25m/day)
          </button>
          <button
            onClick={() => { setDailyMinutes(15); setSkipDaysWeek(2); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              dailyMinutes === 15 && skipDaysWeek === 2
                ? 'bg-[#D97706] text-white border-[#D97706] shadow-2xs'
                : 'bg-[#F5F2EA] border-[#E5E2D9] text-[#7A837C] hover:text-[#2D362E]'
            }`}
          >
            ⚠️ Moderate Skip (2 days/wk)
          </button>
          <button
            onClick={() => { setDailyMinutes(5); setSkipDaysWeek(5); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              dailyMinutes === 5 && skipDaysWeek === 5
                ? 'bg-[#B85B56] text-white border-[#B85B56] shadow-2xs'
                : 'bg-[#F5F2EA] border-[#E5E2D9] text-[#7A837C] hover:text-[#2D362E]'
            }`}
          >
            🛑 Procrastination Trap
          </button>
        </div>
      </div>

      {/* Dynamic Controls Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-[#F5F2EA] p-4.5 rounded-2xl border border-[#E5E2D9]">
        <div>
          <div className="flex justify-between items-center text-xs font-semibold mb-1.5 text-[#2D362E]">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#5E7161]" /> Daily Target Focus Time:
            </span>
            <span className="text-[#5E7161] font-bold">{dailyMinutes} minutes/day</span>
          </div>
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={dailyMinutes}
            onChange={(e) => setDailyMinutes(Number(e.target.value))}
            className="w-full accent-[#5E7161] cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center text-xs font-semibold mb-1.5 text-[#2D362E]">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#B85B56]" /> Skipped Days Per Week:
            </span>
            <span className={skipDaysWeek > 2 ? 'text-[#B85B56] font-bold' : 'text-[#5E7161] font-bold'}>
              {skipDaysWeek} days skipped
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="6"
            step="1"
            value={skipDaysWeek}
            onChange={(e) => setSkipDaysWeek(Number(e.target.value))}
            className="w-full accent-[#B85B56] cursor-pointer"
          />
        </div>
      </div>

      {/* Main Recharts Chart */}
      <div className="h-64 w-full mb-6 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-2xl backdrop-blur-2xs">
            <RefreshCw className="w-6 h-6 text-[#5E7161] animate-spin" />
          </div>
        )}

        {forecast?.forecastData && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecast.forecastData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E2D9" />
              <XAxis dataKey="week" stroke="#7A837C" tick={{ fontSize: 12 }} />
              <YAxis stroke="#7A837C" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#FDFCF8', borderColor: '#E5E2D9', borderRadius: '16px', fontSize: '12px', color: '#2D362E' }}
                labelStyle={{ color: '#2D362E', fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey="consistentMastery"
                name="Consistent Course Mastery %"
                stroke="#5E7161"
                strokeWidth={3}
                dot={{ r: 4, fill: '#5E7161' }}
              />
              <Line
                type="monotone"
                dataKey="procrastinatingMastery"
                name="Procrastinating Mastery %"
                stroke="#B85B56"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4, fill: '#B85B56' }}
              />
              <Line
                type="monotone"
                dataKey="petHealthConsistent"
                name="Spirit Pet Health (Consistent)"
                stroke="#8BA88E"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="petHealthProcrastinating"
                name="Spirit Pet Health (If Procrastinating)"
                stroke="#D97706"
                strokeWidth={2}
                strokeDasharray="3 3"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* AI Comparative Insights Cards */}
      {forecast && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#F0F4F0] border border-[#8BA88E]/40 p-4 rounded-2xl">
            <h4 className="text-xs font-bold text-[#5E7161] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#5E7161]" /> If You Stay Consistent
            </h4>
            <p className="text-xs text-[#2D362E] leading-relaxed">
              {forecast.outcomes.ifConsistent}
            </p>
          </div>

          <div className="bg-[#FFF5F5] border border-[#E8C5B0] p-4 rounded-2xl">
            <h4 className="text-xs font-bold text-[#B85B56] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#B85B56]" /> If Procrastination Wins
            </h4>
            <p className="text-xs text-[#2D362E] leading-relaxed">
              {forecast.outcomes.ifProcrastinating}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
