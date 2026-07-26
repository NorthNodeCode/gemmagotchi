import React from 'react';
import { PetState } from '../types';
import { Flame, Coins, Droplets, LayoutDashboard, Sparkles, BookOpen, TrendingUp, Play } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'focus' | 'farm' | 'courses' | 'trajectory';
  setActiveTab: (tab: 'dashboard' | 'focus' | 'farm' | 'courses' | 'trajectory') => void;
  pet: PetState;
  gems: number;
  waterMins: number;
  streakDays: number;
  onStartSprint: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pet,
  gems,
  waterMins,
  streakDays,
  onStartSprint,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#F5F2EA]/95 border-b border-[#E5E2D9] backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-[#5E7161] flex items-center justify-center text-white font-serif font-bold shadow-md shadow-[#5E7161]/20">
              G4
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-serif font-bold text-[#2D362E] tracking-tight">Gemma 4 Study</h1>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#8BA88E]/20 border border-[#8BA88E]/30 text-[#5E7161]">
                  AI
                </span>
              </div>
              <p className="text-[10px] font-medium text-[#7A837C]">Anti-Procrastination Spirit Companion</p>
            </div>
          </div>

          {/* Quick Sprint Button on Mobile */}
          <button
            onClick={onStartSprint}
            className="md:hidden px-3.5 py-1.5 bg-[#5E7161] hover:bg-[#4E5F51] text-white font-bold text-xs rounded-full flex items-center gap-1 shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Sprint
          </button>
        </div>

        {/* Center Nav Tabs */}
        <nav className="flex items-center gap-1 bg-[#EAE6D9]/90 p-1 rounded-2xl border border-[#E5E2D9] overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-[#5E7161] text-white shadow-sm font-bold'
                : 'text-[#7A837C] hover:text-[#2D362E] hover:bg-[#F5F2EA]/80'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Sanctuary
          </button>

          <button
            onClick={() => setActiveTab('focus')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'focus'
                ? 'bg-[#5E7161] text-white shadow-sm font-bold'
                : 'text-[#7A837C] hover:text-[#2D362E] hover:bg-[#F5F2EA]/80'
            }`}
          >
            <Play className="w-3.5 h-3.5" /> Focus Room
          </button>

          <button
            onClick={() => setActiveTab('farm')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'farm'
                ? 'bg-[#5E7161] text-white shadow-sm font-bold'
                : 'text-[#7A837C] hover:text-[#2D362E] hover:bg-[#F5F2EA]/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Spirit Farm
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'courses'
                ? 'bg-[#5E7161] text-white shadow-sm font-bold'
                : 'text-[#7A837C] hover:text-[#2D362E] hover:bg-[#F5F2EA]/80'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Course Maps
          </button>

          <button
            onClick={() => setActiveTab('trajectory')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'trajectory'
                ? 'bg-[#5E7161] text-white shadow-sm font-bold'
                : 'text-[#7A837C] hover:text-[#2D362E] hover:bg-[#F5F2EA]/80'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Trajectory
          </button>
        </nav>

        {/* Right Metric Counters */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5E2D9] text-[#D97706] font-bold text-xs shadow-2xs">
            <Flame className="w-4 h-4 fill-[#D97706]" />
            <span>{streakDays}d Streak</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5E2D9] text-[#5E7161] font-bold text-xs shadow-2xs">
            <Coins className="w-4 h-4" />
            <span>{gems} Gems</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5E2D9] text-[#4A7C72] font-bold text-xs shadow-2xs">
            <Droplets className="w-4 h-4" />
            <span>{waterMins}m Dew</span>
          </div>
        </div>
      </div>
    </header>
  );
};
