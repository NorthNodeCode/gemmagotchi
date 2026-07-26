import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import { AvatarSprite, ItemSprite } from "./PixelSprite";
import { AVATAR_COUNT, EGG_FOR_SPECIES, SPECIES_LIST, type PetSpecies } from "../lib/sprites";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";
import { MaterialInput, type AttachedFile } from "./MaterialInput";

export interface OnboardingResult {
  character: number;
  species: PetSpecies;
  petName: string;
  subject: string;
  examDate: string;
  notes: string;
  minutesPerDay: number;
  /** From the calibration step; null when skipped. */
  calibration: {
    answers: Array<{ correct: boolean; seconds: number }>;
    depthPref: "low" | "medium" | "high";
  } | null;
}

/**
 * Three fixed, timed questions — deliberately not generated. The point is a
 * clean speed/care reading on identical items for everyone, before any course
 * material exists. Depth is asked outright afterwards, because a preference
 * you can state should never have to be inferred.
 */
const CALIBRATION_BANK = [
  {
    question: "All Zorns are Mips. No Mip can fly. Can a Zorn fly?",
    options: ["Yes", "No", "Can't tell from this"],
    correctIndex: 1,
  },
  {
    question: "A pen and a cap cost £1.10 together. The pen costs £1 more than the cap. What does the cap cost?",
    options: ["5p", "10p", "15p"],
    correctIndex: 0,
  },
  {
    question: "A mark of 42/60 is the same as:",
    options: ["60%", "65%", "70%"],
    correctIndex: 2,
  },
];

const DEPTH_CHOICES = [
  { level: "low" as const, label: "Just the essentials", sub: "Fast, tight explanations" },
  { level: "medium" as const, label: "A balanced walkthrough", sub: "The standard depth" },
  { level: "high" as const, label: "Everything", sub: "Mechanisms, edge cases, exam traps" },
];

const SAMPLE_NOTES = `Spaced repetition works because of the forgetting curve. Ebbinghaus showed memory decays exponentially: without review you retain roughly 40% after one day and 25% after six days.

Reviewing just before you would have forgotten resets the curve, and each successful review flattens it — the next safe gap is longer. This is why intervals expand: 1 day, 3 days, 7 days, 21 days.

The Leitner system implements this with boxes. A card you get right moves up one box and is reviewed less often. A card you get wrong drops to box 1 and comes back tomorrow. Box 1 might be daily, box 2 every 3 days, box 3 weekly, box 4 every 3 weeks.

Active recall is the other half. Retrieving an answer from memory strengthens it far more than re-reading it, because the effortful search is what consolidates the trace. Re-reading feels productive and produces almost no durable learning — this gap between how well you think you know it and how well you do is called the fluency illusion.`;

export const Onboarding: React.FC<{
  busy: boolean;
  onComplete: (result: OnboardingResult) => void;
}> = ({ busy, onComplete }) => {
  const [step, setStep] = useState(0);
  const [character, setCharacter] = useState(1);
  const [species, setSpecies] = useState<PetSpecies>("chicken");
  const [petName, setPetName] = useState("");
  const [subject, setSubject] = useState("");
  const [examDate, setExamDate] = useState(defaultExamDate());
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [minutesPerDay, setMinutesPerDay] = useState(20);

  // Calibration state
  const [calIndex, setCalIndex] = useState(0);
  const [calPicked, setCalPicked] = useState<number | null>(null);
  const [calAnswers, setCalAnswers] = useState<Array<{ correct: boolean; seconds: number }>>([]);
  const calShownAt = useRef(Date.now());

  const canFinish = subject.trim().length > 1 && notes.trim().length > 40;

  function finish(calibration: OnboardingResult["calibration"]) {
    onComplete({
      character,
      species,
      petName: petName.trim() || "Biscuit",
      subject: subject.trim(),
      examDate,
      notes: notes.trim(),
      minutesPerDay,
      calibration,
    });
  }

  function answerCalibration(i: number) {
    if (calPicked !== null) return;
    setCalPicked(i);
    const seconds = Math.round((Date.now() - calShownAt.current) / 1000);
    const correct = i === CALIBRATION_BANK[calIndex].correctIndex;
    setCalAnswers((a) => [...a, { correct, seconds }]);
    setTimeout(() => {
      setCalPicked(null);
      setCalIndex((n) => n + 1);
      calShownAt.current = Date.now();
    }, 700);
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] px-4 py-10 text-[#2D362E]">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#E5E2D9] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#5E7161]">
            <Sparkles className="h-3 w-3" /> Powered by Gemma 4
          </div>
          <h1 className="font-serif text-4xl font-bold">Gemmagotchi</h1>
          <p className="mt-2 text-sm text-[#7A837C]">
            A study companion that grows when you learn — and never makes you feel bad when you don't.
          </p>
        </header>

        <div className="rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
          {step === 0 && (
            <Section title="Who's studying?" subtitle="Pick the character that represents you.">
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
                {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setCharacter(n)}
                    className={`flex items-center justify-center rounded-2xl border-2 p-2 transition-all ${
                      character === n
                        ? "border-[#5E7161] bg-[#F0F4F0]"
                        : "border-[#E5E2D9] bg-white hover:border-[#8BA88E]"
                    }`}
                  >
                    <AvatarSprite character={n} size={48} animate={character === n} />
                  </button>
                ))}
              </div>
              <NextButton onClick={() => setStep(1)} label="Next: choose your egg" />
            </Section>
          )}

          {step === 1 && (
            <Section
              title="Choose an egg"
              subtitle="It hatches once you've learned a few things. What comes out is up to you."
            >
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {SPECIES_LIST.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSpecies(s.id)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition-all ${
                      species === s.id
                        ? "border-[#5E7161] bg-[#F0F4F0]"
                        : "border-[#E5E2D9] bg-white hover:border-[#8BA88E]"
                    }`}
                  >
                    <motion.div
                      animate={species === s.id ? { rotate: [0, -8, 0, 8, 0] } : {}}
                      transition={{ repeat: Infinity, duration: 2.2 }}
                    >
                      <ItemSprite item={EGG_FOR_SPECIES[s.id]} size={40} />
                    </motion.div>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#7A837C]">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>

              <label className="mt-5 block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7A837C]">
                  Name your companion
                </span>
                <input
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="Biscuit"
                  maxLength={20}
                  className="w-full rounded-2xl border border-[#E5E2D9] bg-[#FDFCF8] px-4 py-3 text-sm outline-none focus:border-[#5E7161]"
                />
              </label>

              <NextButton onClick={() => setStep(2)} label="Next: what are you studying?" />
            </Section>
          )}

          {step === 2 && (
            <Section
              title="What are you studying?"
              subtitle="Paste your actual notes or lecture material. Every lesson is taught from this — not from generic internet content."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7A837C]">
                    Subject
                  </span>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Distributed Systems"
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
                  onUseSample={() => {
                    setNotes(SAMPLE_NOTES);
                    if (!subject) setSubject("Memory and Spaced Repetition");
                  }}
                />
              </div>

              <label className="mt-2 block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7A837C]">
                  Realistically, how many minutes a day? ({minutesPerDay} min)
                </span>
                <input
                  type="range"
                  min={5}
                  max={90}
                  step={5}
                  value={minutesPerDay}
                  onChange={(e) => setMinutesPerDay(Number(e.target.value))}
                  className="w-full accent-[#5E7161]"
                />
              </label>

              <button
                disabled={!canFinish || busy}
                onClick={() => {
                  setStep(3);
                  calShownAt.current = Date.now();
                }}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5E7161] py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#4E5F51] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next: one minute about how you learn <ArrowRight className="h-4 w-4" />
              </button>
              {!canFinish && (
                <p className="mt-2 text-center text-[11px] text-[#7A837C]">
                  Add a subject and at least a paragraph of notes to continue.
                </p>
              )}
            </Section>
          )}

          {step === 3 && (
            <Section
              title="One minute about how you learn"
              subtitle="Three quick questions to read your speed, then one about depth. This tunes how deeply Gemma teaches and how hard the questions push — you can change it any time."
            >
              {busy ? (
                <div className="py-8 text-center">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[#5E7161]" />
                  <p className="text-sm font-bold">Gemma 4 is planning your course…</p>
                </div>
              ) : calIndex < CALIBRATION_BANK.length ? (
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#7A837C]">
                    {calIndex + 1} of {CALIBRATION_BANK.length} · answer at your natural speed
                  </div>
                  <h3 className="mb-3 font-serif text-lg font-bold leading-snug">
                    {CALIBRATION_BANK[calIndex].question}
                  </h3>
                  <div className="space-y-2">
                    {CALIBRATION_BANK[calIndex].options.map((opt, i) => {
                      const isRight = i === CALIBRATION_BANK[calIndex].correctIndex;
                      return (
                        <button
                          key={i}
                          onClick={() => answerCalibration(i)}
                          disabled={calPicked !== null}
                          className={`w-full rounded-2xl border p-3 text-left text-sm transition-all ${
                            calPicked === null
                              ? "border-[#E5E2D9] bg-[#FDFCF8] hover:border-[#8BA88E]"
                              : isRight
                              ? "border-[#5E7161] bg-[#F0F4F0]"
                              : calPicked === i
                              ? "border-[#E8C5B0] bg-[#FFF5F5]"
                              : "border-[#E5E2D9] opacity-60"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => finish(null)}
                    className="mt-4 text-[11px] font-bold text-[#7A837C] underline underline-offset-2"
                  >
                    Skip — use balanced defaults
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="mb-1 font-serif text-lg font-bold">
                    Last one: when something new is explained, you want…
                  </h3>
                  <div className="mt-3 space-y-2">
                    {DEPTH_CHOICES.map((c) => (
                      <button
                        key={c.level}
                        onClick={() => finish({ answers: calAnswers, depthPref: c.level })}
                        className="flex w-full items-center justify-between rounded-2xl border border-[#E5E2D9] bg-[#FDFCF8] p-3.5 text-left transition-all hover:border-[#5E7161] hover:bg-[#F0F4F0]"
                      >
                        <div>
                          <div className="text-sm font-bold">{c.label}</div>
                          <div className="text-[11px] text-[#7A837C]">{c.sub}</div>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[#5E7161]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                step === i ? "w-8 bg-[#5E7161]" : "w-4 bg-[#E5E2D9]"
              }`}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
    <h2 className="font-serif text-2xl font-bold">{title}</h2>
    <p className="mb-5 mt-1 text-sm text-[#7A837C]">{subtitle}</p>
    {children}
  </motion.div>
);

const NextButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    onClick={onClick}
    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5E7161] py-3 text-sm font-bold text-white transition-all hover:bg-[#4E5F51]"
  >
    {label} <ArrowRight className="h-4 w-4" />
  </button>
);

function defaultExamDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}
