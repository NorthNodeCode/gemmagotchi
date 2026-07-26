import React from 'react';
import { motion } from 'motion/react';
import { Course, PetState, FarmPlot, StudyLog } from '../types';
import { PetCompanion } from './PetCompanion';
import { NudgeBanner } from './NudgeBanner';
import { Play, Sparkles, TrendingUp, Clock, Award, ShieldAlert, BookOpen, Flame, ArrowRight, CheckCircle2 } from 'lucide-react';

interface DashboardViewProps {
  pet: PetState;
  courses: Course[];
  activeCourse: Course | null;
  gems: number;
  waterMins: number;
  streakDays: number;
  studyLogs: StudyLog[];
  farmPlots: FarmPlot[];
  onFeedPet: () => void;
  onStartSprint: () => void;
  onNavigateTab: (tab: 'dashboard' | 'focus' | 'farm' | 'courses' | 'trajectory') => void;
  onSelectCourse: (courseId: string) => void;
  onTriggerRescue: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  pet,
  courses,
  activeCourse,
  gems,
  waterMins,
  streakDays,
  studyLogs,
  farmPlots,
  onFeedPet,
  onStartSprint,
  onNavigateTab,
  onSelectCourse,
  onTriggerRescue,
}) => {
  const totalMinsStudied = studyLogs.reduce((acc, log) => acc + log.durationMins, 0);
  const matureCrops = farmPlots.filter((p) => p.stage === 3).length;

  return (
    <div className="space-y-6">
      {/* 1. Proactive Gemma 4 Nudge Banner */}
      <NudgeBanner
        pet={pet}
        currentCourseTitle={activeCourse?.title}
        streakDays={streakDays}
        onQuickAction={onStartSprint}
      />

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Focus Time */}
        <div className="bg-white border border-[#E5E2D9] p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#F5F2EA] border border-[#E5E2D9] text-[#5E7161]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#7A837C] uppercase tracking-wider">Total Focus Time</p>
            <h4 className="text-lg font-serif font-bold text-[#2D362E]">{totalMinsStudied} mins</h4>
          </div>
        </div>

        {/* Streak Velocity */}
        <div className="bg-white border border-[#E5E2D9] p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#FFF8F0] border border-[#F0D194] text-[#D97706]">
            <Flame className="w-5 h-5 fill-[#D97706]" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#7A837C] uppercase tracking-wider">Streak Velocity</p>
            <h4 className="text-lg font-serif font-bold text-[#D97706]">{streakDays} Days</h4>
          </div>
        </div>

        {/* Spirit Size & Health */}
        <div className="bg-white border border-[#E5E2D9] p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${pet.isSick ? 'bg-[#FFF5F5] border-[#E8C5B0] text-[#B85B56]' : 'bg-[#F0F4F0] border-[#E5E2D9] text-[#5E7161]'}`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#7A837C] uppercase tracking-wider">Spirit Vitality</p>
            <h4 className={`text-lg font-serif font-bold ${pet.isSick ? 'text-[#B85B56]' : 'text-[#5E7161]'}`}>
              {(pet.sizeScale || 1).toFixed(1)}x • {pet.health}%
            </h4>
          </div>
        </div>

        {/* Mature Farm Crops */}
        <div className="bg-white border border-[#E5E2D9] p-4 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#F5F2EA] border border-[#E5E2D9] text-[#8C593B]">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#7A837C] uppercase tracking-wider">Farm Harvests</p>
            <h4 className="text-lg font-serif font-bold text-[#8C593B]">{matureCrops} Ready</h4>
          </div>
        </div>
      </div>

      {/* 3. Main Split View: Spirit Pet Stage vs What They Can Learn */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Spirit Pet & Farm Companion */}
        <div className="lg:col-span-5 space-y-4">
          <PetCompanion
            pet={pet}
            onFeedPet={onFeedPet}
            gems={gems}
            onPetClick={() => onNavigateTab('farm')}
          />

          {/* Quick Farm Preview Action */}
          <div className="bg-[#F5F2EA] border border-[#E5E2D9] p-4 rounded-2xl flex items-center justify-between">
            <div>
              <h4 className="text-xs font-serif font-bold text-[#2D362E]">Spirit Farm Sanctuary</h4>
              <p className="text-[11px] text-[#7A837C]">{waterMins}m Dew available to nurture crops.</p>
            </div>
            <button
              onClick={() => onNavigateTab('farm')}
              className="px-3.5 py-1.5 bg-white hover:bg-[#EAE6D9] text-[#2D362E] text-xs font-bold rounded-xl transition-all border border-[#E5E2D9] flex items-center gap-1 shadow-2xs"
            >
              Visit Farm <ArrowRight className="w-3.5 h-3.5 text-[#5E7161]" />
            </button>
          </div>
        </div>

        {/* Right Col: Course Tracks + What They Can Learn */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Course Spotlight */}
          {activeCourse ? (
            <div className="bg-white border border-[#E5E2D9] rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#8BA88E]/20 border border-[#8BA88E]/40 text-[#5E7161] uppercase tracking-wider">
                    Current Focus Track
                  </span>
                  <h3 className="text-xl font-serif font-bold text-[#2D362E] mt-1.5">{activeCourse.title}</h3>
                </div>

                <button
                  onClick={onStartSprint}
                  className="px-4 py-2.5 bg-[#5E7161] hover:bg-[#4E5F51] text-white font-bold text-xs rounded-2xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" /> Continue Sprint
                </button>
              </div>

              <p className="text-xs text-[#7A837C] mb-4 leading-relaxed">{activeCourse.description}</p>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs font-bold text-[#2D362E] mb-1">
                  <span>Course Progress</span>
                  <span className="text-[#5E7161]">{activeCourse.progressPercent}%</span>
                </div>
                <div className="w-full bg-[#F5F2EA] rounded-full h-2.5 overflow-hidden border border-[#E5E2D9]">
                  <div
                    className="bg-[#5E7161] h-full rounded-full transition-all duration-500"
                    style={{ width: `${activeCourse.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Next Uncompleted Module Preview */}
              <div className="bg-[#F5F2EA] p-4 rounded-2xl border border-[#E5E2D9]">
                <p className="text-[10px] font-bold text-[#7A837C] uppercase tracking-wider mb-1">Next Lesson to Learn:</p>
                {activeCourse.modules.find((m) => !m.completed) ? (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-[#2D362E]">
                        {activeCourse.modules.find((m) => !m.completed)?.title}
                      </h4>
                      <p className="text-[11px] text-[#7A837C] line-clamp-1">
                        {activeCourse.modules.find((m) => !m.completed)?.description}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#5E7161] bg-white px-2.5 py-1 rounded-xl border border-[#E5E2D9] shrink-0">
                      {activeCourse.modules.find((m) => !m.completed)?.durationMins}m
                    </span>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-[#5E7161]">🎉 All modules completed! Generate a new custom course below.</p>
                )}
              </div>
            </div>
          ) : null}

          {/* Courses You Can Learn Section */}
          <div className="bg-white border border-[#E5E2D9] rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-serif font-bold text-[#2D362E] flex items-center gap-2">
                <BookOpen className="w-4.5 h-4.5 text-[#5E7161]" /> Curriculum Maps
              </h3>
              <button
                onClick={() => onNavigateTab('courses')}
                className="text-xs text-[#5E7161] font-bold hover:underline flex items-center gap-1"
              >
                View All Tracks <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {courses.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectCourse(c.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    c.id === activeCourse?.id
                      ? 'bg-[#F5F2EA] border-[#5E7161] ring-1 ring-[#5E7161]/20'
                      : 'bg-[#FDFCF8] border-[#E5E2D9] hover:border-[#8BA88E]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-[#5E7161] uppercase tracking-wider">{c.category}</span>
                    <span className="text-[10px] text-[#7A837C] font-bold">{c.progressPercent}%</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#2D362E] line-clamp-1">{c.title}</h4>
                  <p className="text-[11px] text-[#7A837C] line-clamp-1 mt-0.5">{c.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Future Trajectory Teaser */}
          <div className="bg-[#F5F2EA] border border-[#E5E2D9] rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white border border-[#E5E2D9] text-[#5E7161] rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#2D362E]">Track Learning Outcomes Over Time</h4>
                <p className="text-[11px] text-[#7A837C]">See 30-day forecast comparing consistency vs procrastination.</p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('trajectory')}
              className="px-4 py-2 bg-[#5E7161] hover:bg-[#4E5F51] text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0"
            >
              Open Simulator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
