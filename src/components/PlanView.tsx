import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Play, CalendarDays, ChevronDown, FileText, Layers, Plus } from "lucide-react";
import {
  courseProgress,
  currentTopic,
  orderedTopics,
  topicProgress,
} from "../lib/course";
import type { Course, SubLesson } from "../types";

/**
 * The course map.
 *
 * A university module is weeks of topics, not a flat list, and a student
 * navigates by week ("where was Fourier?"). So weeks are the outer structure
 * and only the week you are actually on is expanded — the rest stay closed so
 * a twelve-week module is still a page you can look at without flinching.
 */
export const PlanView: React.FC<{
  course: Course | null;
  /** Topic title -> accuracy percent, for topics with enough misses to matter. */
  weakByTopic: Record<string, number>;
  onStart: (module: SubLesson) => void;
  onDrillTopic: (topicTitle: string) => void;
  onAddTopic: () => void;
  onBigReview: () => void;
}> = ({ course, weakByTopic, onStart, onDrillTopic, onAddTopic, onBigReview }) => {
  const current = currentTopic(course);
  const [open, setOpen] = useState<string | null>(current?.id ?? null);

  if (!course) {
    return (
      <div className="rounded-3xl border border-[#E5E2D9] bg-white p-10 text-center text-sm text-[#7A837C]">
        No study plan yet.
      </div>
    );
  }

  const topics = orderedTopics(course);
  const progress = courseProgress(course);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A837C]">
          Built by Gemma 4 from your lectures
        </span>
        <h2 className="mt-1 font-serif text-2xl font-bold">{course.title}</h2>
        <p className="mt-1.5 text-sm text-[#7A837C]">{course.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#5E7161]">
          <span className="flex items-center gap-1.5 rounded-full border border-[#E5E2D9] bg-[#F5F2EA] px-2.5 py-1 font-bold">
            <CalendarDays className="h-3.5 w-3.5" />
            {course.examDate ? new Date(course.examDate).toLocaleDateString() : "no deadline set"}
          </span>
          <span className="font-bold">
            {topics.length} {topics.length === 1 ? "week" : "weeks"} · {progress.done} of{" "}
            {progress.total} sub-lessons done
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {topics.map((topic) => {
          const tp = topicProgress(topic);
          const isOpen = open === topic.id;
          const isCurrent = topic.id === current?.id;

          return (
            <div
              key={topic.id}
              className={`overflow-hidden rounded-3xl border bg-white ${
                isCurrent ? "border-[#8BA88E]" : "border-[#E5E2D9]"
              }`}
            >
              <button
                onClick={() => setOpen(isOpen ? null : topic.id)}
                className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-[#FDFCF8]"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-2xl text-[9px] font-bold uppercase leading-none ${
                    tp.pct === 100
                      ? "bg-[#5E7161] text-white"
                      : isCurrent
                      ? "bg-[#F0F4F0] text-[#5E7161]"
                      : "bg-[#F5F2EA] text-[#7A837C]"
                  }`}
                >
                  {tp.pct === 100 ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <>
                      <span className="opacity-70">wk</span>
                      <span className="text-sm">{topic.week}</span>
                    </>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-serif text-base font-bold">{topic.title}</h3>
                    {isCurrent && tp.pct < 100 && (
                      <span className="shrink-0 rounded-full bg-[#F0F4F0] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#5E7161]">
                        You're here
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    {weakByTopic[topic.title] != null && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onDrillTopic(topic.title);
                        }}
                        title="Your accuracy here is low — one click to drill it"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#E8C5B0] bg-[#FFF5F5] px-2 py-0.5 text-[10px] font-bold text-[#B85B56] hover:bg-[#FDEAEA]"
                      >
                        {weakByTopic[topic.title]}% — drill this
                      </span>
                    )}
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#E5E2D9]">
                      <div
                        className="h-full rounded-full bg-[#8BA88E]"
                        style={{ width: `${tp.pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#7A837C]">
                      {tp.done}/{tp.total}
                    </span>
                    {topic.files.length > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-[#7A837C]">
                        <FileText className="h-3 w-3" />
                        {topic.files.length}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[#7A837C] transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="border-t border-[#E5E2D9] p-4">
                      {topic.files.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {topic.files.map((f) => (
                            <span
                              key={f}
                              className="inline-flex items-center gap-1 rounded-full border border-[#E5E2D9] bg-[#F5F2EA] px-2 py-0.5 text-[10px] text-[#5E7161]"
                            >
                              <FileText className="h-2.5 w-2.5" /> {f}
                            </span>
                          ))}
                        </div>
                      )}

                      <ol className="space-y-2">
                        {topic.modules.map((m, i) => (
                          <li
                            key={m.id}
                            className={`flex items-center gap-3 rounded-2xl border p-3.5 ${
                              m.completed ? "border-[#E5E2D9] bg-[#F5F2EA]" : "border-[#E5E2D9] bg-white"
                            }`}
                          >
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                m.completed ? "bg-[#5E7161] text-white" : "bg-[#F0F4F0] text-[#5E7161]"
                              }`}
                            >
                              {m.completed ? <Check className="h-3.5 w-3.5" /> : i + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div
                                className={`font-serif text-sm font-bold ${
                                  m.completed ? "text-[#7A837C]" : "text-[#2D362E]"
                                }`}
                              >
                                {m.title}
                              </div>
                              <p className="mt-0.5 truncate text-[11px] text-[#7A837C]">
                                {m.description}
                              </p>
                            </div>
                            <button
                              onClick={() => onStart(m)}
                              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all ${
                                m.completed
                                  ? "border border-[#E5E2D9] bg-white text-[#5E7161] hover:bg-[#F0F4F0]"
                                  : "bg-[#5E7161] text-white hover:bg-[#4E5F51]"
                              }`}
                            >
                              <Play className="h-2.5 w-2.5 fill-current" />
                              {m.completed ? "Again" : "Start"}
                            </button>
                          </li>
                        ))}
                        {topic.modules.length === 0 && (
                          <li className="rounded-2xl border border-dashed border-[#E5E2D9] p-4 text-center text-xs text-[#7A837C]">
                            No sub-lessons planned for this week yet.
                          </li>
                        )}
                      </ol>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          onClick={onAddTopic}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#E5E2D9] p-4 text-xs font-bold text-[#7A837C] transition-colors hover:border-[#8BA88E] hover:text-[#5E7161]"
        >
          <Plus className="h-4 w-4" /> Add next week's lecture
        </button>
        <button
          onClick={onBigReview}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#8BA88E] bg-[#F0F4F0] p-4 text-xs font-bold text-[#5E7161] transition-colors hover:bg-[#E7EEE7]"
        >
          <Layers className="h-4 w-4" /> Big review — every week at once
        </button>
      </div>
    </div>
  );
};
