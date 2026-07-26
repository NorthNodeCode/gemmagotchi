import React from "react";
import { Check, Play, CalendarDays } from "lucide-react";
import type { Course, SubLesson } from "../types";

export const PlanView: React.FC<{
  course: Course | null;
  onStart: (module: SubLesson) => void;
}> = ({ course, onStart }) => {
  if (!course) {
    return (
      <div className="rounded-3xl border border-[#E5E2D9] bg-white p-10 text-center text-sm text-[#7A837C]">
        No study plan yet.
      </div>
    );
  }

  const done = course.modules.filter((m) => m.completed).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A837C]">
          Built by Gemma 4 from your notes
        </span>
        <h2 className="mt-1 font-serif text-2xl font-bold">{course.title}</h2>
        <p className="mt-1.5 text-sm text-[#7A837C]">{course.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#5E7161]">
          <span className="flex items-center gap-1.5 rounded-full border border-[#E5E2D9] bg-[#F5F2EA] px-2.5 py-1 font-bold">
            <CalendarDays className="h-3.5 w-3.5" />
            {course.examDate ? new Date(course.examDate).toLocaleDateString() : "no deadline set"}
          </span>
          <span className="font-bold">
            {done} of {course.modules.length} sub-lessons done
          </span>
        </div>
      </div>

      <ol className="space-y-2.5">
        {course.modules.map((m, i) => (
          <li
            key={m.id}
            className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${
              m.completed ? "border-[#E5E2D9] bg-[#F5F2EA]" : "border-[#E5E2D9] bg-white"
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                m.completed ? "bg-[#5E7161] text-white" : "bg-[#F0F4F0] text-[#5E7161]"
              }`}
            >
              {m.completed ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={`font-serif text-base font-bold ${
                  m.completed ? "text-[#7A837C]" : "text-[#2D362E]"
                }`}
              >
                {m.title}
              </div>
              <p className="mt-0.5 truncate text-xs text-[#7A837C]">{m.description}</p>
            </div>
            <button
              onClick={() => onStart(m)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                m.completed
                  ? "border border-[#E5E2D9] bg-white text-[#5E7161] hover:bg-[#F0F4F0]"
                  : "bg-[#5E7161] text-white hover:bg-[#4E5F51]"
              }`}
            >
              <Play className="h-3 w-3 fill-current" />
              {m.completed ? "Again" : "Start"}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
};
