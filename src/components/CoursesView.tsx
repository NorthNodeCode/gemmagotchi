import React, { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { MaterialInput, type AttachedFile } from "./MaterialInput";
import { courseProgress, orderedTopics } from "../lib/course";
import type { Course } from "../types";

/**
 * Courses are university modules: a student is never studying one thing.
 * Each carries its own material and plan, but they all share one pet — the
 * companion is a relationship with the learner, not with a syllabus.
 */

export interface NewCourseRequest {
  subject: string;
  examDate: string;
  notes: string;
}

interface Props {
  courses: Course[];
  activeCourseId: string | null;
  busy: boolean;
  onSetActive: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (req: NewCourseRequest) => void;
  onOpenPlan: () => void;
}

export const CoursesView: React.FC<Props> = ({
  courses,
  activeCourseId,
  busy,
  onSetActive,
  onDelete,
  onAdd,
  onOpenPlan,
}) => {
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold">Your modules</h2>
          <p className="mt-1 text-sm text-[#7A837C]">
            One companion, all your courses. The active module is what today's lesson comes from.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex shrink-0 items-center gap-2 rounded-2xl bg-[#5E7161] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#4E5F51]"
        >
          <Plus className="h-4 w-4" /> Add module
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            active={course.id === activeCourseId}
            onSetActive={() => onSetActive(course.id)}
            onDelete={() => onDelete(course.id)}
            onOpenPlan={onOpenPlan}
          />
        ))}

        <button
          onClick={() => setAdding(true)}
          className="flex min-h-[190px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-[#E5E2D9] p-5 text-[#7A837C] transition-colors hover:border-[#8BA88E] hover:text-[#5E7161]"
        >
          <Plus className="h-6 w-6" />
          <span className="text-xs font-bold">Add another module</span>
          <span className="max-w-[80%] text-center text-[11px]">
            Paste notes or attach the lecture slides
          </span>
        </button>
      </div>

      {adding && (
        <AddCourseModal
          busy={busy}
          onClose={() => setAdding(false)}
          onAdd={(req) => {
            onAdd(req);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
};

const CourseCard: React.FC<{
  course: Course;
  active: boolean;
  onSetActive: () => void;
  onDelete: () => void;
  onOpenPlan: () => void;
}> = ({ course, active, onSetActive, onDelete, onOpenPlan }) => {
  const { done, total, pct } = courseProgress(course);
  const weeks = orderedTopics(course).length;

  return (
    <motion.div
      layout
      className={`flex flex-col rounded-3xl border-2 bg-white p-5 transition-colors ${
        active ? "border-[#5E7161]" : "border-[#E5E2D9] hover:border-[#8BA88E]"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A837C]">
          {course.subject}
        </span>
        {active ? (
          <span className="shrink-0 rounded-full bg-[#F0F4F0] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5E7161]">
            Active
          </span>
        ) : (
          <button
            onClick={onDelete}
            aria-label={`Delete ${course.title}`}
            title="Delete module"
            className="shrink-0 text-[#C9CCC7] transition-colors hover:text-[#B85B56]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <h3 className="font-serif text-lg font-bold leading-snug">{course.title}</h3>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#7A837C]">
        <span className="flex items-center gap-1">
          <BookOpen className="h-3 w-3" /> {weeks} {weeks === 1 ? "week" : "weeks"} · {total} sub-lessons
        </span>
        {course.examDate && (
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> {formatDate(course.examDate)}
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-wider text-[#7A837C]">
          <span>Progress</span>
          <span>
            {done}/{total}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#E5E2D9]">
          <motion.div
            className="h-full rounded-full bg-[#8BA88E]"
            initial={false}
            animate={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex-1" />

      {active ? (
        <button
          onClick={onOpenPlan}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#F0F4F0] py-2.5 text-xs font-bold text-[#5E7161] transition-colors hover:bg-[#E4EBE4]"
        >
          Open course map <ArrowRight className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          onClick={onSetActive}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#5E7161] py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#4E5F51]"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Study this
        </button>
      )}
    </motion.div>
  );
};

const AddCourseModal: React.FC<{
  busy: boolean;
  onClose: () => void;
  onAdd: (req: NewCourseRequest) => void;
}> = ({ busy, onClose, onAdd }) => {
  const [subject, setSubject] = useState("");
  const [examDate, setExamDate] = useState(defaultExamDate());
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);

  const canAdd = subject.trim().length > 1 && notes.trim().length > 40;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#2D362E]/60 p-4 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="my-8 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="font-serif text-xl font-bold">Add a module</h3>
            <p className="mt-0.5 text-xs text-[#7A837C]">
              Gemma 4 builds the plan from your material — not from generic internet content.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-[#7A837C] transition-colors hover:bg-[#F5F2EA] hover:text-[#2D362E]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7A837C]">
              Module
            </span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="CS3028 Software Engineering"
              className="w-full rounded-2xl border border-[#E5E2D9] bg-[#FDFCF8] px-4 py-3 text-sm outline-none focus:border-[#5E7161]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7A837C]">
              Exam or deadline
            </span>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full rounded-2xl border border-[#E5E2D9] bg-[#FDFCF8] px-4 py-3 text-sm outline-none focus:border-[#5E7161]"
            />
          </label>
        </div>

        <div className="mt-4">
          <MaterialInput
            notes={notes}
            onNotesChange={setNotes}
            files={files}
            onFilesChange={setFiles}
            rows={7}
          />
        </div>

        <button
          disabled={!canAdd || busy}
          onClick={() => onAdd({ subject: subject.trim(), examDate, notes: notes.trim() })}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5E7161] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#4E5F51] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Gemma 4 is planning this module…
            </>
          ) : (
            <>
              Build the plan <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        {!canAdd && (
          <p className="mt-2 text-center text-[11px] text-[#7A837C]">
            Add a module name and at least a paragraph of material to continue.
          </p>
        )}
      </motion.div>
    </div>
  );
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function defaultExamDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}
