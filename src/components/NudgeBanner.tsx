import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AINudge, PetState } from '../types';
import { fetchAINudge } from '../services/api';
import { Sparkles, ShieldAlert, ArrowRight, Zap, RefreshCw } from 'lucide-react';

interface NudgeBannerProps {
  pet: PetState;
  currentCourseTitle?: string;
  streakDays: number;
  onQuickAction: () => void;
}

export const NudgeBanner: React.FC<NudgeBannerProps> = ({
  pet,
  currentCourseTitle,
  streakDays,
  onQuickAction,
}) => {
  const [nudgeData, setNudgeData] = useState<AINudge | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadNudge = async () => {
    setIsLoading(true);
    const data = await fetchAINudge({
      petState: pet,
      currentCourse: currentCourseTitle,
      streakDays,
      procrastinationRisk: pet.isSick || pet.health < 45 ? 'HIGH' : 'LOW',
    });
    setNudgeData(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadNudge();
  }, [pet.health, pet.isSick, streakDays, currentCourseTitle]);

  const isUrgent = pet.isSick || pet.health < 45 || nudgeData?.tone === 'urgent';

  return (
    <div
      className={`rounded-2xl p-4.5 border transition-all shadow-xs relative overflow-hidden ${
        isUrgent
          ? 'bg-[#FFF8F6] border-[#E8C5B0]'
          : 'bg-[#F5F2EA] border-[#E5E2D9]'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl border shrink-0 ${
              isUrgent
                ? 'bg-[#FCE8E6] border-[#E8C5B0] text-[#B85B56]'
                : 'bg-[#EAE6D9] border-[#E5E2D9] text-[#5E7161]'
            }`}
          >
            {isUrgent ? (
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5E7161]">
                Gemma 4 Active Accountability Coach
              </span>
              {nudgeData?.petReaction && (
                <span className="text-[10px] font-serif font-semibold text-[#8C593B] italic">
                  "{nudgeData.petReaction}"
                </span>
              )}
            </div>

            <p className="text-xs font-medium text-[#2D362E] leading-relaxed">
              {nudgeData?.nudge || 'Ready to fight procrastination? Complete 1 micro-task now to keep your Spirit Pet thriving!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={loadNudge}
            disabled={isLoading}
            className="p-2 bg-[#EAE6D9] hover:bg-[#E2DDD0] text-[#7A837C] hover:text-[#2D362E] rounded-xl transition-all border border-[#E5E2D9]"
            title="Refresh Nudge"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onQuickAction}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
              isUrgent
                ? 'bg-[#B85B56] hover:bg-[#A34E4A] text-white shadow-[#B85B56]/20'
                : 'bg-[#5E7161] hover:bg-[#4E5F51] text-white shadow-[#5E7161]/20'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {nudgeData?.actionItem || 'Take Action Now'}
          </button>
        </div>
      </div>
    </div>
  );
};
