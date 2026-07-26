import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Course, CourseModule } from '../types';
import { generateCourseBreakdown } from '../services/api';
import { BookOpen, Plus, Sparkles, CheckCircle2, Circle, Clock, Play, ArrowRight, BrainCircuit } from 'lucide-react';

interface CourseExplorerProps {
  courses: Course[];
  activeCourseId: string;
  onSelectCourse: (courseId: string) => void;
  onAddCourse: (course: Course) => void;
  onStartModuleSprint: (course: Course, module: CourseModule) => void;
  onToggleModuleComplete: (courseId: string, moduleId: string) => void;
}

export const CourseExplorer: React.FC<CourseExplorerProps> = ({
  courses,
  activeCourseId,
  onSelectCourse,
  onAddCourse,
  onStartModuleSprint,
  onToggleModuleComplete,
}) => {
  const [showCreatorModal, setShowCreatorModal] = useState<boolean>(false);
  const [newTopicInput, setNewTopicInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicInput.trim()) return;

    setIsGenerating(true);
    const generated = await generateCourseBreakdown(newTopicInput.trim());

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      title: generated.title || newTopicInput,
      category: 'Custom AI Track',
      description: generated.description || `AI Generated study path for ${newTopicInput}`,
      iconName: 'BrainCircuit',
      estimatedWeeks: generated.estimatedWeeks || 4,
      progressPercent: 0,
      modules: (generated.modules || []).map((m: any, idx: number) => ({
        id: m.id || `mod-${idx}`,
        title: m.title,
        description: m.description,
        durationMins: m.durationMins || 20,
        completed: false,
        keyTakeaway: m.keyTakeaway,
      })),
    };

    onAddCourse(newCourse);
    setIsGenerating(false);
    setShowCreatorModal(false);
    setNewTopicInput('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Custom Course Creation CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E5E2D9] p-6 rounded-3xl shadow-sm">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#2D362E] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#5E7161]" /> Learning Tracks & Curriculum Maps
          </h2>
          <p className="text-xs text-[#7A837C] mt-1">
            Explore active courses or generate an AI-crafted syllabus with Gemma 4 for any subject.
          </p>
        </div>

        <button
          onClick={() => setShowCreatorModal(true)}
          className="px-4.5 py-2.5 bg-[#5E7161] hover:bg-[#4E5F51] text-white text-xs font-bold rounded-2xl transition-all shadow-sm flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Generate Custom Course (Gemma 4)
        </button>
      </div>

      {/* Course Cards Carousel / Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {courses.map((course) => {
          const isSelected = course.id === activeCourseId;
          const completedCount = course.modules.filter((m) => m.completed).length;

          return (
            <motion.div
              key={course.id}
              whileHover={{ y: -3 }}
              onClick={() => onSelectCourse(course.id)}
              className={`p-5 rounded-3xl border cursor-pointer transition-all shadow-2xs relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#F5F2EA] border-[#5E7161] ring-1 ring-[#5E7161]/20'
                  : 'bg-[#FDFCF8] border-[#E5E2D9] hover:border-[#8BA88E]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EAE6D9] text-[#5E7161] border border-[#E5E2D9] uppercase tracking-wider">
                    {course.category}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#7A837C]">
                    {course.progressPercent}%
                  </span>
                </div>

                <h3 className="text-sm font-serif font-bold text-[#2D362E] mb-1 line-clamp-1">{course.title}</h3>
                <p className="text-xs text-[#7A837C] line-clamp-2 mb-3 leading-relaxed">{course.description}</p>
              </div>

              <div>
                {/* Progress Bar */}
                <div className="w-full bg-[#EAE6D9] rounded-full h-2 mb-2 overflow-hidden border border-[#E5E2D9]">
                  <div
                    className="bg-[#5E7161] h-full rounded-full transition-all duration-500"
                    style={{ width: `${course.progressPercent}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-[#7A837C] font-semibold">
                  <span>{completedCount}/{course.modules.length} Modules</span>
                  <span>{course.estimatedWeeks} Wks</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Course Modules Breakdown */}
      {activeCourse && (
        <div className="bg-white border border-[#E5E2D9] rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[#E5E2D9] pb-4">
            <div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#8BA88E]/20 border border-[#8BA88E]/40 text-[#5E7161] uppercase tracking-wider">
                Active Learning Track
              </span>
              <h3 className="text-xl font-serif font-bold text-[#2D362E] mt-1.5">{activeCourse.title}</h3>
              <p className="text-xs text-[#7A837C] mt-0.5">{activeCourse.description}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-bold text-[#5E7161] block">
                  {activeCourse.progressPercent}% Completed
                </span>
                <span className="text-[10px] text-[#7A837C]">
                  {activeCourse.modules.filter((m) => m.completed).length} of {activeCourse.modules.length} Done
                </span>
              </div>
            </div>
          </div>

          {/* Module List */}
          <div className="space-y-3">
            {activeCourse.modules.map((module, idx) => (
              <div
                key={module.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  module.completed
                    ? 'bg-[#F5F2EA]/60 border-[#E5E2D9] opacity-80'
                    : 'bg-[#FDFCF8] border-[#E5E2D9] hover:border-[#8BA88E]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => onToggleModuleComplete(activeCourse.id, module.id)}
                    className="mt-0.5 text-[#7A837C] hover:text-[#5E7161] transition-colors shrink-0"
                  >
                    {module.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#5E7161]" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[#2D362E]">
                        Module {idx + 1}: {module.title}
                      </span>
                      <span className="text-[10px] text-[#5E7161] bg-[#F5F2EA] px-2.5 py-0.5 rounded-lg border border-[#E5E2D9] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {module.durationMins}m
                      </span>
                    </div>
                    <p className="text-xs text-[#7A837C]">{module.description}</p>

                    {module.keyTakeaway && (
                      <p className="text-[11px] text-[#5E7161] font-semibold mt-1">
                        💡 Key Takeaway: {module.keyTakeaway}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onStartModuleSprint(activeCourse, module)}
                    className="px-3.5 py-2 bg-[#5E7161] hover:bg-[#4E5F51] text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Start Sprint
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Custom Course Generator Modal */}
      <AnimatePresence>
        {showCreatorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D362E]/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white border border-[#E5E2D9] rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-[#F5F2EA] border border-[#E5E2D9] text-[#5E7161] rounded-2xl">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#2D362E]">Gemma 4 Course Generator</h3>
                  <p className="text-xs text-[#7A837C]">Type any subject to build an active study plan.</p>
                </div>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#2D362E] mb-1">
                    What topic or skill do you want to learn?
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Quantum Machine Learning, Macroeconomics, Astrophysics"
                    value={newTopicInput}
                    onChange={(e) => setNewTopicInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FDFCF8] border border-[#E5E2D9] focus:border-[#5E7161] rounded-2xl text-xs text-[#2D362E] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreatorModal(false)}
                    className="px-4 py-2 bg-[#F5F2EA] hover:bg-[#EAE6D9] text-[#2D362E] border border-[#E5E2D9] font-bold text-xs rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="px-4.5 py-2 bg-[#5E7161] hover:bg-[#4E5F51] disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition-all flex items-center gap-2 shadow-sm"
                  >
                    {isGenerating ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin text-[#F0D194]" /> Generating Syllabus...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#F0D194]" /> Build Syllabus
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
