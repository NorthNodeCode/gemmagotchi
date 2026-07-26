import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { ArrowRight, Layers, Loader2, RotateCcw, Target, Zap } from "lucide-react";
import { QuestionCard } from "./TutorRoom";
import { ItemSprite } from "./PixelSprite";
import { ITEM } from "../lib/sprites";
import { allModules, allNotes, orderedTopics, topicOf } from "../lib/course";
import { currentLevels } from "../lib/learnerModel";
import type { CheckQuestion, Course, SubLesson } from "../types";

/**
 * Drills: testing without a lesson attached.
 *
 * Some days a learner will not sit through teaching but will answer questions,
 * and retrieval practice is the highest-yield thing they could be doing anyway.
 * Scope is either one sub-lesson's worth of material or the whole course — the
 * "big review" a student wants the night before an exam.
 */

type Phase = "setup" | "loading" | "running" | "done";
type Scope = { kind: "module"; module: SubLesson } | { kind: "course" };

interface Props {
  course: Course | null;
  /** When set, start immediately on this topic title (from a weak-point chip). */
  autoStartTopic?: string | null;
  onAutoStarted?: () => void;
  hasMasterclass: boolean;
  onCorrect: (weight: number) => void;
  onAnswered: (outcome: { topic: string; kind: "mcq" | "text"; correct: boolean; seconds: number; context: "drill" | "diagnostic" }) => void;
  onDrillComplete: (label: string, score: number, total: number) => void;
}

export const DrillsView: React.FC<Props> = ({
  course,
  autoStartTopic,
  onAutoStarted,
  hasMasterclass,
  onCorrect,
  onAnswered,
  onDrillComplete,
}) => {
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<CheckQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [count, setCount] = useState(5);
  const [label, setLabel] = useState("");
  const [answerTopic, setAnswerTopic] = useState("");

  /** A weak-point chip queued a topic — begin without another click. */
  useEffect(() => {
    if (!autoStartTopic || !course || phase !== "setup") return;
    const topic = orderedTopics(course).find((t) => t.title === autoStartTopic);
    const module = topic?.modules[0] ?? allModules(course)[0];
    onAutoStarted?.();
    if (module) start({ kind: "module", module });
  }, [autoStartTopic, course]);

  async function start(scope: Scope) {
    if (!course) return;
    const title =
      scope.kind === "course" ? `${course.subject}: full review` : scope.module.title;

    setPhase("loading");
    setLabel(title);
    setAnswerTopic(
      scope.kind === "course"
        ? `${course.subject} (review)`
        : topicOf(course, scope.module.id)?.title ?? scope.module.title
    );
    setQuestions([]);
    setIndex(0);
    setScore(0);

    const notes =
      scope.kind === "course"
        ? allNotes(course)
        : topicOf(course, scope.module.id)?.notes ||
          scope.module.sourceExcerpt ||
          allNotes(course);

    try {
      const res = await fetch("/api/ai/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: course.subject,
          notes,
          count,
          levels: currentLevels(),
          scope: scope.kind === "course" ? "course" : "module",
          topics:
            scope.kind === "course"
              ? orderedTopics(course).map((t) => t.title)
              : [scope.module.title],
        }),
      });
      const data = await res.json();
      const qs: CheckQuestion[] = (data.questions ?? []).map((q: any, i: number) => ({
        ...q,
        id: q.id || `d${i}`,
        kind: q.kind === "text" ? "text" : "mcq",
      }));
      if (!qs.length) throw new Error("empty");
      setQuestions(qs);
      setPhase("running");
    } catch {
      setPhase("setup");
    }
  }

  function resolved(correct: boolean) {
    if (correct) {
      setScore((s) => s + 1);
      onCorrect(1);
    }
  }

  function next() {
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setPhase("done");
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.65 } });
      onDrillComplete(label, score, questions.length);
    }
  }

  if (!course) {
    return (
      <p className="rounded-3xl border border-[#E5E2D9] bg-white p-8 text-center text-sm text-[#7A837C]">
        Add a course first — drills are built from your own material.
      </p>
    );
  }

  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-[#E5E2D9] bg-white py-24 text-center">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#5E7161]" />
        <p className="text-sm font-bold">Gemma 4 is writing your drill…</p>
        <p className="mt-1 text-xs text-[#7A837C]">{label}</p>
      </div>
    );
  }

  if (phase === "done") {
    const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-[#E5E2D9] bg-white p-8 text-center shadow-sm"
      >
        <div className="mb-3 flex justify-center">
          <ItemSprite item={ITEM.diamond} size={48} />
        </div>
        <h3 className="font-serif text-2xl font-bold">
          {score} of {questions.length}
        </h3>
        <p className="mt-1 text-sm text-[#7A837C]">
          {pct >= 80
            ? "That is exam-ready recall."
            : pct >= 50
            ? "Solid — the ones you missed are exactly what to study next."
            : "Now you know precisely where to aim. That is what a drill is for."}
        </p>
        <p className="mt-3 text-xs text-[#7A837C]">
          Earned {score * 5} gems · {label}
        </p>
        <div className="mt-6 flex justify-center gap-2.5">
          <button
            onClick={() => setPhase("setup")}
            className="flex items-center gap-2 rounded-2xl bg-[#5E7161] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#4E5F51]"
          >
            <RotateCcw className="h-4 w-4" /> Another drill
          </button>
        </div>
      </motion.div>
    );
  }

  if (phase === "running") {
    const current = questions[index];
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A837C]">
              Drill
            </span>
            <h2 className="font-serif text-xl font-bold">{label}</h2>
          </div>
          <span className="rounded-full border border-[#E5E2D9] bg-white px-3 py-1.5 text-xs font-bold text-[#5E7161]">
            {score} correct
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <QuestionCard
              question={current}
              index={index}
              total={questions.length}
              subject={course.subject}
              hasMasterclass={hasMasterclass}
              onAnswered={({ question, correct, seconds }) =>
                onAnswered({ topic: answerTopic, kind: question.kind, correct, seconds, context: "drill" })
              }
              onResolved={resolved}
              onNext={next}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // setup
  const modules = allModules(course);
  const remaining = modules.filter((m) => !m.completed);
  const done = modules.filter((m) => m.completed);

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-serif text-2xl font-bold">Drills</h2>
        <p className="mt-1 text-sm text-[#7A837C]">
          No lesson, no reading — just questions. Testing yourself is the highest-yield
          thing you can do with the time.
        </p>
      </div>

      <div className="mb-5 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#7A837C]">
          Questions
        </span>
        {[5, 10].map((n) => (
          <button
            key={n}
            onClick={() => setCount(n)}
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all ${
              count === n
                ? "border-[#5E7161] bg-[#5E7161] text-white"
                : "border-[#E5E2D9] bg-white text-[#7A837C] hover:border-[#8BA88E]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* The big one first: it is what a student actually wants before an exam. */}
      <button
        onClick={() => start({ kind: "course" })}
        className="mb-5 flex w-full items-center gap-4 rounded-3xl border-2 border-[#8BA88E] bg-[#F0F4F0] p-5 text-left transition-colors hover:bg-[#E7EEE7]"
      >
        <div className="rounded-2xl border border-[#8BA88E]/40 bg-white p-3 text-[#5E7161]">
          <Layers className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-serif text-lg font-bold">Big review</h3>
          <p className="text-xs text-[#7A837C]">
            Questions spanning all {orderedTopics(course).length} weeks of {course.subject},
            including ones that connect two topics.
          </p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-[#5E7161]" />
      </button>

      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#7A837C]">
        Or drill one topic
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {[...done, ...remaining].map((m) => (
          <button
            key={m.id}
            onClick={() => start({ kind: "module", module: m })}
            className="flex items-center gap-3 rounded-2xl border border-[#E5E2D9] bg-white p-4 text-left transition-colors hover:border-[#8BA88E]"
          >
            <div
              className={`rounded-xl border p-2.5 ${
                m.completed
                  ? "border-[#8BA88E]/40 bg-[#F0F4F0] text-[#5E7161]"
                  : "border-[#E5E2D9] bg-[#F5F2EA] text-[#7A837C]"
              }`}
            >
              {m.completed ? <Target className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold">{m.title}</div>
              <div className="text-[11px] text-[#7A837C]">
                {m.completed ? "Taught — test whether it stuck" : "Not taught yet — try anyway"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
