import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Course, PetState, ProcrastinationRescueData, QuizQuestion } from '../types';
import { fetchProcrastinationRescue, fetchAIQuiz, fetchAINudge } from '../services/api';
import { Play, Pause, RotateCcw, ShieldAlert, Sparkles, CheckCircle2, HelpCircle, ArrowRight, Zap, Award, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FocusStudyRoomProps {
  currentCourse: Course | null;
  pet: PetState;
  onCompleteSession: (mins: number, gems: number, healAmount: number) => void;
  onRescueComplete: (gems: number, healAmount: number) => void;
  onExit: () => void;
}

export const FocusStudyRoom: React.FC<FocusStudyRoomProps> = ({
  currentCourse,
  pet,
  onCompleteSession,
  onRescueComplete,
  onExit,
}) => {
  const [selectedMins, setSelectedMins] = useState<number>(25);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Rescue Mode State
  const [showRescueModal, setShowRescueModal] = useState<boolean>(false);
  const [rescueData, setRescueData] = useState<ProcrastinationRescueData | null>(null);
  const [rescueAnswerSelected, setRescueAnswerSelected] = useState<number | null>(null);
  const [isRescueLoading, setIsRescueLoading] = useState<boolean>(false);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<QuizQuestion[] | null>(null);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);

  // Active Gemma Nudge
  const [liveNudge, setLiveNudge] = useState<string | null>(null);

  // Timer logic
  useEffect(() => {
    let interval: any = null;
    if (isActive && !isPaused && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      const earnedGems = selectedMins * 2;
      const healAmt = selectedMins;
      onCompleteSession(selectedMins, earnedGems, healAmt);
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, secondsLeft, selectedMins, onCompleteSession]);

  // Periodic Nudge Check during session
  useEffect(() => {
    if (isActive && secondsLeft % 300 === 0 && secondsLeft !== selectedMins * 60) {
      fetchAINudge({
        petState: pet,
        currentCourse: currentCourse?.title,
        streakDays: 3,
      }).then((n) => setLiveNudge(n.nudge));
    }
  }, [secondsLeft, isActive]);

  const startSession = (mins: number) => {
    setSelectedMins(mins);
    setSecondsLeft(mins * 60);
    setIsActive(true);
    setIsPaused(false);
    setLiveNudge("Gemma 4 is keeping watch! Keep focus to feed your Spirit Pet.");

    // Load active quiz for the current course
    if (currentCourse && currentCourse.modules.length > 0) {
      const mod = currentCourse.modules[0];
      fetchAIQuiz(mod.title, currentCourse.title).then((res) => {
        if (res.questions) setActiveQuiz(res.questions);
      });
    }
  };

  const handleTriggerRescue = async () => {
    setIsPaused(true);
    setIsRescueLoading(true);
    setShowRescueModal(true);
    const data = await fetchProcrastinationRescue(
      currentCourse ? currentCourse.title : 'General Study',
      'Felt unmotivated and distracted'
    );
    setRescueData(data);
    setIsRescueLoading(false);
  };

  const handleRescueSubmit = () => {
    if (!rescueData) return;
    const gems = rescueData.rewardFocusGems || 20;
    const heal = rescueData.petHealAmount || 25;
    onRescueComplete(gems, heal);
    setShowRescueModal(false);
    setRescueData(null);
    setRescueAnswerSelected(null);
    setIsPaused(false);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border border-[#E5E2D9] rounded-3xl p-6 shadow-sm relative overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 border-b border-[#E5E2D9] pb-4">
        <div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#8BA88E]/20 border border-[#8BA88E]/40 text-[#5E7161] uppercase tracking-wider">
            Active Focus Sanctuary
          </span>
          <h2 className="text-2xl font-serif font-bold text-[#2D362E] mt-1">
            {currentCourse ? currentCourse.title : 'Deep Focus Sprint'}
          </h2>
        </div>

        <button
          onClick={onExit}
          className="px-3.5 py-2 rounded-2xl bg-[#F5F2EA] hover:bg-[#EAE6D9] text-[#2D362E] border border-[#E5E2D9] text-xs font-bold transition-all shadow-2xs"
        >
          Exit Room
        </button>
      </div>

      {/* Main Grid: Timer on Left, Active Recall / Gemma Nudge on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Timer & Controls */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-[#F5F2EA] p-6 rounded-2xl border border-[#E5E2D9]">
          {/* Live Floating Pet Observer */}
          <div className="relative mb-4 flex items-center justify-center">
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 2, -2, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-md ${
                pet.isSick ? 'bg-[#FFF5F5] border-2 border-[#B85B56]' : 'bg-white border-2 border-[#5E7161]'
              }`}
            >
              {pet.type === 'sproutling' ? '🌱' : pet.type === 'pyros' ? '🦊' : '🦉'}
            </motion.div>
            {isActive && (
              <span className="absolute -top-2 right-0 px-2.5 py-0.5 rounded-full bg-[#5E7161] text-white text-[10px] font-bold animate-pulse shadow-2xs">
                WATCHING FOCUS
              </span>
            )}
          </div>

          {/* Time Display */}
          <div className="text-5xl font-mono font-black text-[#2D362E] tracking-wider mb-6">
            {formatTime(secondsLeft)}
          </div>

          {/* Timer Mode Buttons if idle */}
          {!isActive && (
            <div className="flex items-center gap-2 mb-6">
              {[15, 25, 45].map((m) => (
                <button
                  key={m}
                  onClick={() => startSession(m)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    selectedMins === m
                      ? 'bg-[#5E7161] text-white border-[#5E7161] shadow-2xs'
                      : 'bg-white text-[#7A837C] border-[#E5E2D9] hover:text-[#2D362E]'
                  }`}
                >
                  {m}m Sprint
                </button>
              ))}
            </div>
          )}

          {/* Start / Pause / Reset Controls */}
          <div className="flex items-center gap-3 w-full">
            {!isActive ? (
              <button
                onClick={() => startSession(selectedMins)}
                className="w-full py-3 bg-[#5E7161] hover:bg-[#4E5F51] text-white font-bold text-sm rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" /> Start Active Sprint
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="flex-1 py-3 bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={() => {
                    setIsActive(false);
                    setSecondsLeft(selectedMins * 60);
                  }}
                  className="py-3 px-4 bg-white hover:bg-[#EAE6D9] border border-[#E5E2D9] text-[#2D362E] font-bold text-xs rounded-2xl transition-all shadow-2xs"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* ANTI-PROCRASTINATION RESCUE TRIGGER */}
          <button
            onClick={handleTriggerRescue}
            className="mt-4 w-full py-3 px-3.5 bg-[#FFF5F5] hover:bg-[#FEE2E2] border border-[#E8C5B0] rounded-2xl text-[#B85B56] font-bold text-xs transition-all shadow-2xs flex items-center justify-center gap-2 group"
          >
            <ShieldAlert className="w-4 h-4 text-[#B85B56] group-hover:scale-110 transition-transform" />
            Feeling Procrastinative / Stuck? Launch 2-Min Rescue
          </button>
        </div>

        {/* Right Column: Gemma 4 Nudge + Active Recall Drill */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          {/* Active Gemma Nudge Banner */}
          <div className="bg-[#F5F2EA] border border-[#E5E2D9] p-4 rounded-2xl flex items-start gap-3">
            <div className="p-2 bg-white border border-[#E5E2D9] text-[#5E7161] rounded-xl shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#5E7161] uppercase tracking-wider mb-1">
                Gemma 4 Live Nudge
              </h4>
              <p className="text-xs text-[#2D362E] leading-relaxed">
                {liveNudge || "Select a sprint duration and hit Start to begin active learning. Every 5 minutes completed waters your spirit crops!"}
              </p>
            </div>
          </div>

          {/* Active Recall Question Module */}
          {activeQuiz && activeQuiz.length > 0 ? (
            <div className="bg-[#FDFCF8] border border-[#E5E2D9] p-5 rounded-2xl flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F5F2EA] text-[#5E7161] border border-[#E5E2D9]">
                    Active Recall Drill #{currentQuizIndex + 1} of {activeQuiz.length}
                  </span>
                  <span className="text-xs font-bold text-[#D97706] flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> Score: {score} pts
                  </span>
                </div>

                <h3 className="text-sm font-serif font-bold text-[#2D362E] mb-4">
                  {activeQuiz[currentQuizIndex].question}
                </h3>

                <div className="space-y-2 mb-4">
                  {activeQuiz[currentQuizIndex].options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === activeQuiz[currentQuizIndex].correctIndex;

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (showExplanation) return;
                          setSelectedOption(idx);
                          setShowExplanation(true);
                          if (isCorrect) setScore((prev) => prev + 10);
                        }}
                        className={`w-full p-3 rounded-xl text-left text-xs font-semibold transition-all border ${
                          showExplanation
                            ? isCorrect
                              ? 'bg-[#F0F4F0] border-[#5E7161] text-[#2D362E]'
                              : isSelected
                              ? 'bg-[#FFF5F5] border-[#B85B56] text-[#B85B56]'
                              : 'bg-white border-[#E5E2D9] text-[#7A837C]'
                            : isSelected
                            ? 'bg-[#F0F4F0] border-[#5E7161] text-[#2D362E]'
                            : 'bg-white border-[#E5E2D9] hover:border-[#8BA88E] text-[#2D362E]'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {showExplanation && (
                  <div className="p-3.5 bg-[#F5F2EA] border border-[#E5E2D9] rounded-xl text-xs text-[#2D362E]">
                    <p className="font-bold text-[#5E7161] mb-1">Explanation:</p>
                    {activeQuiz[currentQuizIndex].explanation}
                  </div>
                )}
              </div>

              {showExplanation && (
                <div className="pt-3 border-t border-[#E5E2D9] flex justify-end">
                  <button
                    onClick={() => {
                      if (currentQuizIndex < activeQuiz.length - 1) {
                        setCurrentQuizIndex((prev) => prev + 1);
                        setSelectedOption(null);
                        setShowExplanation(false);
                      } else {
                        // Reset or show final score
                        setCurrentQuizIndex(0);
                        setSelectedOption(null);
                        setShowExplanation(false);
                      }
                    }}
                    className="px-4 py-2 bg-[#5E7161] hover:bg-[#4E5F51] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    Next Active Question <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#FDFCF8] border border-[#E5E2D9] p-6 rounded-2xl flex-1 flex flex-col items-center justify-center text-center">
              <Zap className="w-10 h-10 text-[#D97706] mb-2 animate-bounce" />
              <h4 className="text-sm font-serif font-bold text-[#2D362E] mb-1">Active Recall Drills Ready</h4>
              <p className="text-xs text-[#7A837C] max-w-sm">
                Start your study timer to stream personalized active recall questions generated by Gemma 4 for your module!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* PROCRASTINATION EMERGENCY RESCUE MODAL */}
      <AnimatePresence>
        {showRescueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D362E]/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white border border-[#E5E2D9] rounded-3xl p-6 max-w-lg w-full shadow-2xl relative"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-[#FFF5F5] border border-[#E8C5B0] text-[#B85B56] rounded-2xl">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#2D362E]">
                    {rescueData?.rescueTitle || 'Gemma 4 Procrastination Rescue'}
                  </h3>
                  <p className="text-xs text-[#B85B56] font-semibold">
                    2-Minute Low-Friction Mission to Save Spirit Health!
                  </p>
                </div>
              </div>

              {isRescueLoading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[#D97706] animate-spin mb-3" />
                  <p className="text-xs font-bold text-[#2D362E]">Gemma 4 is crafting a 120-second friction breaker...</p>
                </div>
              ) : rescueData ? (
                <div className="space-y-4">
                  {/* Micro challenge text */}
                  <div className="p-4 bg-[#F5F2EA] rounded-2xl border border-[#E5E2D9]">
                    <p className="text-xs font-bold text-[#D97706] uppercase tracking-wider mb-1">
                      Target Action:
                    </p>
                    <p className="text-sm font-semibold text-[#2D362E]">
                      {rescueData.microChallenge}
                    </p>
                  </div>

                  {/* Quick question if provided */}
                  {rescueData.quickQuestion && (
                    <div className="p-4 bg-[#FDFCF8] rounded-2xl border border-[#E5E2D9]">
                      <p className="text-xs font-bold text-[#2D362E] mb-2">
                        {rescueData.quickQuestion.question}
                      </p>
                      <div className="space-y-2">
                        {rescueData.quickQuestion.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => setRescueAnswerSelected(idx)}
                            className={`w-full p-2.5 rounded-xl text-xs text-left transition-all border ${
                              rescueAnswerSelected === idx
                                ? 'bg-[#F0F4F0] border-[#5E7161] text-[#2D362E] font-bold'
                                : 'bg-white border-[#E5E2D9] hover:border-[#8BA88E] text-[#2D362E]'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-[#F0F4F0] border border-[#E5E2D9] rounded-2xl flex items-center justify-between text-xs text-[#5E7161]">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Sparkles className="w-4 h-4 text-[#D97706]" /> Reward: +{rescueData.rewardFocusGems} Gems
                    </span>
                    <span className="flex items-center gap-1.5 font-bold">
                      <Flame className="w-4 h-4 text-[#D97706]" /> Heals Pet: +{rescueData.petHealAmount}%
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleRescueSubmit}
                      className="w-full py-3 bg-[#5E7161] hover:bg-[#4E5F51] text-white font-bold text-xs rounded-2xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Complete 2-Min Rescue Mission!
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
