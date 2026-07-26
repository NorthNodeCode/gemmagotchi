import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { Loader2, ArrowRight, Check, X, Minus, BookOpen } from "lucide-react";
import { PetCompanion } from "./PetCompanion";
import { Markdown } from "./Markdown";
import { fetchChecks, fetchLesson, gradeAnswer } from "../services/api";
import { allModules, allNotes, topicOf } from "../lib/course";
import type { CheckQuestion, Course, GradeResult, PetState, SubLesson } from "../types";

/**
 * The tutor.
 *
 * The teaching loop is deliberately strict, mirroring how the material is
 * actually absorbed: teach exactly ONE concept, stop, check understanding,
 * give feedback, and only then move on. The learner can never be handed two
 * concepts at once, and the check cannot be skipped past.
 */

type Phase = "idle" | "loading" | "teaching" | "checking" | "done";

interface Props {
  course: Course;
  module: SubLesson;
  pet: PetState;
  /** Bought in the gem sanctuary — adds "Go deeper" to every check. */
  hasMasterclass: boolean;
  onAnswered: (outcome: { topic: string; kind: "mcq" | "text"; correct: boolean; seconds: number; context: "lesson" }) => void;
  onCorrect: (weight: number) => void;
  onLessonComplete: (moduleId: string, score: number, total: number) => void;
  onExit: () => void;
}

export const TutorRoom: React.FC<Props> = ({
  course,
  module,
  pet,
  hasMasterclass,
  onAnswered,
  onCorrect,
  onLessonComplete,
  onExit,
}) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [lesson, setLesson] = useState("");
  const [questions, setQuestions] = useState<CheckQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [celebrate, setCelebrate] = useState(0);
  const [petSays, setPetSays] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lessonRef = useRef<HTMLDivElement>(null);

  /**
   * The prose and the questions are fetched independently so the learner can
   * start reading the moment the lesson lands, while the checks are still
   * being written. On a laptop-sized model that difference is a minute or more
   * of staring at a spinner.
   */
  useEffect(() => {
    let cancelled = false;
    const input = {
      moduleTitle: module.title,
      sourceExcerpt: module.sourceExcerpt,
      notes: topicOf(course, module.id)?.notes ?? allNotes(course),
      subject: course.subject,
      previousLessons: allModules(course).filter((m) => m.completed).map((m) => m.title),
    };

    setPhase("loading");
    setError(null);
    setQuestions([]);
    setQIndex(0);
    setScore(0);

    fetchLesson(input)
      .then((text) => {
        if (cancelled) return;
        setLesson(text);
        setPhase("teaching");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "The tutor could not be reached.");
        setPhase("idle");
      });

    fetchChecks(input)
      .then((qs) => !cancelled && setQuestions(qs))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [module.id]);

  const current = questions[qIndex];

  function handleQuestionResolved(wasCorrect: boolean) {
    if (wasCorrect) {
      setScore((s) => s + 1);
      setCelebrate((c) => c + 1);
      onCorrect(1);
      setPetSays(pickPraise(pet.name));
      setTimeout(() => setPetSays(null), 2600);
    }
  }

  function nextQuestion() {
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
    } else {
      setPhase("done");
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.65 } });
      onLessonComplete(module.id, score, questions.length);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Lesson column */}
      <div className="lg:col-span-8">
        <div className="rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4 border-b border-[#E5E2D9] pb-4">
            <div>
              <span className="rounded-full border border-[#8BA88E]/40 bg-[#8BA88E]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#5E7161]">
                Sub-lesson
              </span>
              <h2 className="mt-1.5 font-serif text-2xl font-bold text-[#2D362E]">{module.title}</h2>
              <p className="mt-0.5 text-xs text-[#7A837C]">{course.subject}</p>
            </div>
            <button
              onClick={onExit}
              className="shrink-0 rounded-2xl border border-[#E5E2D9] bg-[#F5F2EA] px-3.5 py-2 text-xs font-bold transition-all hover:bg-[#EAE6D9]"
            >
              Back
            </button>
          </div>

          {phase === "loading" && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#5E7161]" />
              <p className="text-sm font-bold text-[#2D362E]">
                Gemma 4 is preparing this lesson from your notes…
              </p>
              <p className="mt-1 text-xs text-[#7A837C]">One concept, taught properly.</p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-[#E8C5B0] bg-[#FFF5F5] p-4 text-xs text-[#B85B56]">
              {error}
            </div>
          )}

          {(phase === "teaching" || phase === "checking" || phase === "done") && (
            <div ref={lessonRef}>
              <Markdown content={lesson} />

              {phase === "teaching" && (
                <button
                  onClick={() => setPhase("checking")}
                  disabled={questions.length === 0}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5E7161] py-3.5 text-sm font-bold text-white transition-all hover:bg-[#4E5F51] disabled:opacity-50"
                >
                  {questions.length === 0 ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Read on — your questions are
                      being written…
                    </>
                  ) : (
                    <>
                      I've read this — check my understanding <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Check questions appear below the lesson, one at a time. */}
        <AnimatePresence mode="wait">
          {phase === "checking" && current && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mt-5"
            >
              <QuestionCard
                question={current}
                index={qIndex}
                total={questions.length}
                subject={course.subject}
                hasMasterclass={hasMasterclass}
                onAnswered={({ question, correct, seconds }) =>
                  onAnswered({
                    topic: topicOf(course, module.id)?.title ?? module.title,
                    kind: question.kind,
                    correct,
                    seconds,
                    context: "lesson",
                  })
                }
                onResolved={handleQuestionResolved}
                onNext={nextQuestion}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-3xl border border-[#E5E2D9] bg-white p-6 text-center shadow-sm"
          >
            <BookOpen className="mx-auto mb-2 h-8 w-8 text-[#5E7161]" />
            <h3 className="font-serif text-xl font-bold">Sub-lesson complete</h3>
            <p className="mt-1 text-sm text-[#7A837C]">
              You got {score} of {questions.length} checks right, and {pet.name} grew.
            </p>
            <button
              onClick={onExit}
              className="mt-5 rounded-2xl bg-[#5E7161] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#4E5F51]"
            >
              Back to the plan
            </button>
          </motion.div>
        )}
      </div>

      {/* Pet column */}
      <aside className="lg:col-span-4">
        <div className="sticky top-4 rounded-3xl border border-[#E5E2D9] bg-[#F5F2EA] p-5">
          <PetCompanion pet={pet} size={128} celebrateKey={celebrate} speech={petSays} />
          <p className="mt-4 text-center text-xs leading-relaxed text-[#7A837C]">
            {pet.stage === "egg"
              ? `Every question you get right brings ${pet.name} closer to hatching.`
              : `${pet.name} grows a little every time you get something right.`}
          </p>
          {questions.length > 0 && (
            <div className="mt-4 flex justify-center gap-1.5">
              {questions.map((q, i) => (
                <div
                  key={q.id}
                  className={`h-1.5 w-8 rounded-full ${
                    i < qIndex ? "bg-[#5E7161]" : i === qIndex && phase === "checking" ? "bg-[#D97706]" : "bg-[#E5E2D9]"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

// ---------------------------------------------------------------------------

export const QuestionCard: React.FC<{
  question: CheckQuestion;
  index: number;
  total: number;
  subject: string;
  hasMasterclass: boolean;
  onResolved: (correct: boolean) => void;
  /** Fires once per question with correctness and time-to-answer. */
  onAnswered?: (outcome: { question: CheckQuestion; correct: boolean; seconds: number }) => void;
  onNext: () => void;
}> = ({ question, index, total, subject, hasMasterclass, onResolved, onAnswered, onNext }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  /** When this question appeared — the clock the answer time is measured on. */
  const shownAt = useRef(Date.now());
  useEffect(() => {
    shownAt.current = Date.now();
  }, [question.id]);

  function reportAnswer(correct: boolean) {
    onAnswered?.({
      question,
      correct,
      seconds: Math.round((Date.now() - shownAt.current) / 1000),
    });
  }
  const [deeper, setDeeper] = useState<string | null>(null);
  const [deepening, setDeepening] = useState(false);
  const revealed = selected !== null || result !== null;

  /** Explain-mode Socratic call, scoped to this exact question and answer. */
  async function explainDeeper() {
    setDeepening(true);
    try {
      const res = await fetch("/api/ai/socratic-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: subject,
          mode: "explain",
          userMessage: `I was asked: "${question.question}". The answer is: ${
            question.modelAnswer ??
            question.explanation ??
            (question.options && question.correctIndex != null
              ? question.options[question.correctIndex]
              : "")
          }. Explain the underlying idea properly so I actually understand why.`,
        }),
      });
      const data = await res.json();
      setDeeper(data.reply || "Gemma could not reach that one — try again in a moment.");
    } catch {
      setDeeper("Gemma could not reach that one — try again in a moment.");
    } finally {
      setDeepening(false);
    }
  }

  async function submitText() {
    if (text.trim().length < 2) return;
    setGrading(true);
    const graded = await gradeAnswer({
      question: question.question,
      modelAnswer: question.modelAnswer,
      learnerAnswer: text,
      subject,
    });
    setGrading(false);
    setResult(graded);
    reportAnswer(graded.verdict === "correct");
    onResolved(graded.verdict === "correct");
  }

  function chooseOption(i: number) {
    if (revealed) return;
    setSelected(i);
    reportAnswer(i === question.correctIndex);
    onResolved(i === question.correctIndex);
  }

  return (
    <div className="rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full border border-[#E5E2D9] bg-[#F5F2EA] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#5E7161]">
          Check {index + 1} of {total}
        </span>
        {question.kind === "text" && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D97706]">
            In your own words
          </span>
        )}
      </div>

      <h3 className="mb-4 font-serif text-lg font-bold leading-snug text-[#2D362E]">
        {question.question}
      </h3>

      {question.kind === "mcq" && question.options && (
        <div className="space-y-2">
          {question.options.map((opt, i) => {
            const isCorrect = i === question.correctIndex;
            const isPicked = selected === i;
            return (
              <button
                key={i}
                onClick={() => chooseOption(i)}
                disabled={revealed}
                className={`flex w-full items-start gap-2.5 rounded-2xl border p-3.5 text-left text-sm transition-all ${
                  revealed
                    ? isCorrect
                      ? "border-[#5E7161] bg-[#F0F4F0] font-semibold"
                      : isPicked
                      ? "border-[#B85B56] bg-[#FFF5F5] text-[#B85B56]"
                      : "border-[#E5E2D9] bg-white text-[#7A837C]"
                    : "border-[#E5E2D9] bg-white hover:border-[#8BA88E]"
                }`}
              >
                {revealed && (isCorrect ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : isPicked ? <X className="mt-0.5 h-4 w-4 shrink-0" /> : <span className="w-4" />)}
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      )}

      {question.kind === "text" && (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!!result}
            rows={4}
            placeholder="Explain it as if to a friend…"
            className="w-full resize-y rounded-2xl border border-[#E5E2D9] bg-[#FDFCF8] px-4 py-3 text-sm outline-none focus:border-[#5E7161] disabled:opacity-70"
          />
          {!result && (
            <button
              onClick={submitText}
              disabled={grading || text.trim().length < 2}
              className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-[#5E7161] px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-[#4E5F51] disabled:opacity-40"
            >
              {grading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gemma 4 is marking this…
                </>
              ) : (
                "Submit answer"
              )}
            </button>
          )}
        </div>
      )}

      {/* Feedback: honest about correctness, never unkind about it. */}
      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 rounded-2xl border p-4 text-sm ${verdictStyle(result, selected, question)}`}
        >
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
            {verdictIcon(result, selected, question)}
            {verdictLabel(result, selected, question)}
          </div>
          <p className="leading-relaxed text-[#2D362E]">
            {result?.feedback || question.explanation || "Here's the reasoning behind the answer."}
          </p>
          {result?.missedPoint && (
            <p className="mt-2 text-xs text-[#7A837C]">
              <span className="font-bold">Worth adding: </span>
              {result.missedPoint}
            </p>
          )}

          {/* Unlocked with the Socratic masterclass in the gem sanctuary. */}
          {hasMasterclass && (
            <div className="mt-3 border-t border-current/10 pt-3">
              {deeper ? (
                <Markdown content={deeper} className="text-[13px]" />
              ) : (
                <button
                  onClick={explainDeeper}
                  disabled={deepening}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#5E7161] underline underline-offset-2 disabled:opacity-50"
                >
                  {deepening ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gemma 4 is going deeper…
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-3.5 w-3.5" /> Go deeper on this
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      {revealed && (
        <button
          onClick={onNext}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2D362E] py-3 text-sm font-bold text-white transition-all hover:bg-[#1F2620]"
        >
          {index + 1 === total ? "Finish sub-lesson" : "Next check"} <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

function verdict(result: GradeResult | null, selected: number | null, q: CheckQuestion) {
  if (result) return result.verdict;
  if (selected === null) return "partial";
  return selected === q.correctIndex ? "correct" : "incorrect";
}

function verdictStyle(result: GradeResult | null, selected: number | null, q: CheckQuestion) {
  const v = verdict(result, selected, q);
  if (v === "correct") return "border-[#8BA88E] bg-[#F0F4F0]";
  if (v === "partial") return "border-[#E8C5B0] bg-[#FFFBF5]";
  return "border-[#E8C5B0] bg-[#FFF5F5]";
}

function verdictIcon(result: GradeResult | null, selected: number | null, q: CheckQuestion) {
  const v = verdict(result, selected, q);
  if (v === "correct") return <Check className="h-3.5 w-3.5 text-[#5E7161]" />;
  if (v === "partial") return <Minus className="h-3.5 w-3.5 text-[#D97706]" />;
  return <X className="h-3.5 w-3.5 text-[#B85B56]" />;
}

function verdictLabel(result: GradeResult | null, selected: number | null, q: CheckQuestion) {
  const v = verdict(result, selected, q);
  if (v === "correct") return <span className="text-[#5E7161]">That's right</span>;
  if (v === "partial") return <span className="text-[#D97706]">Partly there</span>;
  return <span className="text-[#B85B56]">Not quite — here's the answer</span>;
}

const PRAISE = [
  (n: string) => `${n} did a little hop!`,
  (n: string) => `${n} is thrilled.`,
  (n: string) => `Nice one — ${n} grew a bit.`,
  (n: string) => `${n} looks very pleased with you.`,
];

function pickPraise(name: string): string {
  return PRAISE[Math.floor(Math.random() * PRAISE.length)](name);
}
