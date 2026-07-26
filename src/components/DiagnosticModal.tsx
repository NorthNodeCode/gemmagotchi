import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, ClipboardCheck, Loader2, X } from "lucide-react";
import type { CheckQuestion } from "../types";

/**
 * The diagnostic: three questions on the material you just uploaded, BEFORE
 * the plan is built, so Gemma plans around what you already know and what you
 * don't. Wrong answers here are the most useful thing that can happen — they
 * are what get your weak spots taught first.
 *
 * Always skippable. A gate you cannot decline is a wall, and walls are what
 * procrastinators bounce off.
 */

export interface DiagnosticOutcome {
  baseline: string | null;
  answers: Array<{ correct: boolean; seconds: number; kind: "mcq" | "text" }>;
}

interface Props {
  subject: string;
  notes: string;
  onDone: (outcome: DiagnosticOutcome) => void;
}

export const DiagnosticModal: React.FC<Props> = ({ subject, notes, onDone }) => {
  const [questions, setQuestions] = useState<CheckQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<Array<{ q: CheckQuestion; correct: boolean; seconds: number }>>([]);
  const [loading, setLoading] = useState(true);
  const shownAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/drill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, notes, count: 3, scope: "module", topics: [subject] }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        // Diagnostics stay snappy: MCQs only, no free-text grading round-trips.
        const qs = (d.questions ?? []).filter(
          (q: any) => q.kind !== "text" && Array.isArray(q.options) && q.options.length >= 2
        );
        if (qs.length === 0) {
          onDone({ baseline: null, answers: [] });
          return;
        }
        setQuestions(qs.slice(0, 3));
        setLoading(false);
        shownAt.current = Date.now();
      })
      .catch(() => !cancelled && onDone({ baseline: null, answers: [] }));
    return () => {
      cancelled = true;
    };
  }, []);

  function choose(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const q = questions[index];
    const seconds = Math.round((Date.now() - shownAt.current) / 1000);
    const correct = i === q.correctIndex;
    const nextResults = [...results, { q, correct, seconds }];
    setResults(nextResults);

    setTimeout(() => {
      if (index + 1 < questions.length) {
        setIndex(index + 1);
        setPicked(null);
        shownAt.current = Date.now();
      } else {
        finish(nextResults);
      }
    }, 900);
  }

  function finish(all: Array<{ q: CheckQuestion; correct: boolean; seconds: number }>) {
    const right = all.filter((r) => r.correct);
    const wrong = all.filter((r) => !r.correct);
    const clip = (s: string) => s.slice(0, 110);
    const baseline =
      all.length === 0
        ? null
        : [
            right.length ? `Already solid on: ${right.map((r) => clip(r.q.question)).join(" | ")}.` : "",
            wrong.length
              ? `Struggled with: ${wrong.map((r) => clip(r.q.question)).join(" | ")}.`
              : "Got everything right — do not spend time re-teaching basics.",
          ]
            .filter(Boolean)
            .join(" ");

    onDone({
      baseline,
      answers: all.map((r) => ({ correct: r.correct, seconds: r.seconds, kind: "mcq" as const })),
    });
  }

  const q = questions[index];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D362E]/60 p-4 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-[#E5E2D9] bg-[#F5F2EA] p-2.5 text-[#5E7161]">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold">Quick check before we plan</h3>
              <p className="text-xs text-[#7A837C]">
                Three questions on your material. Wrong answers are the useful ones — they
                get taught first.
              </p>
            </div>
          </div>
          <button
            onClick={() => onDone({ baseline: null, answers: [] })}
            aria-label="Skip straight to planning"
            className="shrink-0 rounded-full p-2 text-[#7A837C] transition-colors hover:bg-[#F5F2EA] hover:text-[#2D362E]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[#5E7161]" />
            <p className="text-xs text-[#7A837C]">Gemma 4 is reading your material…</p>
            <button
              onClick={() => onDone({ baseline: null, answers: [] })}
              className="mt-4 text-[11px] font-bold text-[#5E7161] underline underline-offset-2"
            >
              Skip straight to planning
            </button>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#7A837C]">
              <span>
                Question {index + 1} of {questions.length}
              </span>
              <span>{subject}</span>
            </div>
            <h4 className="mb-3 font-serif text-base font-bold leading-snug">{q.question}</h4>
            <div className="space-y-2">
              {q.options?.map((opt, i) => {
                const isRight = i === q.correctIndex;
                const isPicked = picked === i;
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={picked !== null}
                    className={`flex w-full items-start gap-2 rounded-2xl border p-3 text-left text-sm transition-all ${
                      picked === null
                        ? "border-[#E5E2D9] bg-[#FDFCF8] hover:border-[#8BA88E]"
                        : isRight
                        ? "border-[#5E7161] bg-[#F0F4F0]"
                        : isPicked
                        ? "border-[#E8C5B0] bg-[#FFF5F5]"
                        : "border-[#E5E2D9] bg-white opacity-60"
                    }`}
                  >
                    {picked !== null && isRight && (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#5E7161]" />
                    )}
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => finish(results)}
              className="mt-4 text-[11px] font-bold text-[#7A837C] underline underline-offset-2"
            >
              Skip the rest — plan with what you have
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};
