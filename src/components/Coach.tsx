import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { BrainCircuit, Loader2, RefreshCw, Settings2, Target, X } from "lucide-react";
import {
  coachEvidence,
  effectiveLevels,
  localCoachRead,
} from "../lib/learnerModel";
import type {
  AnswerLogEntry,
  CoachReport,
  Level,
  LearnerLevels,
  LearnerProfile,
  StudyLogEntry,
} from "../types";

/**
 * The coach's voice in the UI.
 *
 * Two rules carried over from everywhere else in the app: nothing here shames
 * (a weak topic is a target, not a verdict), and nothing here blocks on the
 * model — a local, templated read of the same evidence renders instantly and
 * the expert's version replaces it when it lands.
 */

const CACHE_KEY = "gemmagotchi_coach";
/** Re-ask the expert once this many new answers have accumulated. */
const REFRESH_EVERY = 5;

interface CacheShape {
  atCount: number;
  report: CoachReport;
  model?: string;
}

function loadCache(): CacheShape | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheShape) : null;
  } catch {
    return null;
  }
}

interface CardProps {
  answers: AnswerLogEntry[];
  studyLog: StudyLogEntry[];
  profile: LearnerProfile;
  subject?: string;
  onOpenProfile: () => void;
  onDrillTopic: (topic: string) => void;
}

export const CoachCard: React.FC<CardProps> = ({
  answers,
  studyLog,
  profile,
  subject,
  onOpenProfile,
  onDrillTopic,
}) => {
  const [cache, setCache] = useState<CacheShape | null>(loadCache);
  const [loading, setLoading] = useState(false);

  const evidence = useMemo(() => coachEvidence(answers, studyLog), [answers, studyLog]);
  const levels = effectiveLevels(profile);
  const realAnswers = evidence.totalAnswers;

  async function refresh() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence, levels, subject }),
      });
      const data = await res.json();
      if (data?.read) {
        const next: CacheShape = {
          atCount: realAnswers,
          report: data,
          model: data._gemma?.model,
        };
        setCache(next);
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      }
    } catch {
      // The local read stays up — silence over spinners.
    } finally {
      setLoading(false);
    }
  }

  // Ask again once enough new evidence has accumulated.
  useEffect(() => {
    if (realAnswers === 0) return;
    if (cache && realAnswers - cache.atCount < REFRESH_EVERY) return;
    refresh();
  }, [realAnswers]);

  const report = cache?.report;
  const read = report?.read ?? localCoachRead(evidence, levels);
  const weakPoints = report?.weakPoints?.length
    ? report.weakPoints
    : evidence.weakTopics.map((t) => ({
        topic: t.topic,
        evidence: `${t.correct} of ${t.attempts} right`,
        suggestion: "Drill it.",
      }));

  return (
    <div className="rounded-3xl border border-[#E5E2D9] bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#5E7161]">
          <BrainCircuit className="h-3.5 w-3.5" />
          Your coach's read
          {cache?.model && (
            <span className="rounded-full border border-[#E5E2D9] bg-[#F5F2EA] px-1.5 py-0.5 font-mono text-[9px] normal-case tracking-normal text-[#7A837C]">
              {cache.model}
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          title="Ask the coach again"
          aria-label="Refresh the coach's read"
          className="rounded-full p-1.5 text-[#7A837C] transition-colors hover:bg-[#F5F2EA] hover:text-[#2D362E] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>

      <p className="text-sm leading-relaxed text-[#2D362E]">{read}</p>

      {report?.nextBestAction && (
        <p className="mt-2 rounded-2xl border border-[#8BA88E]/40 bg-[#F0F4F0] px-3 py-2 text-xs">
          <span className="font-bold text-[#5E7161]">Best next 10 minutes: </span>
          {report.nextBestAction}
        </p>
      )}

      {weakPoints.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {weakPoints.slice(0, 3).map((w) => (
            <button
              key={w.topic}
              onClick={() => onDrillTopic(w.topic)}
              title={`${w.evidence} — ${w.suggestion}`}
              className="flex items-center gap-1.5 rounded-full border border-[#E8C5B0] bg-[#FFF5F5] px-2.5 py-1 text-[11px] font-bold text-[#B85B56] transition-colors hover:bg-[#FDEAEA]"
            >
              <Target className="h-3 w-3" /> {w.topic} · drill this
            </button>
          ))}
        </div>
      )}

      <button
        onClick={onOpenProfile}
        className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-[#7A837C] underline underline-offset-2 transition-colors hover:text-[#2D362E]"
      >
        <Settings2 className="h-3 w-3" />
        depth {levels.depth} · pace {levels.pace} · challenge {levels.challenge} — adjust
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------

const LEVELS: Level[] = ["low", "medium", "high"];

const DIMENSIONS: Array<{ key: keyof LearnerLevels; label: string; blurb: string }> = [
  { key: "depth", label: "Lesson depth", blurb: "How much each lesson explains — essentials, balanced, or every edge case." },
  { key: "pace", label: "Pace", blurb: "How dense the study plan is. Measured from how quickly you answer." },
  { key: "challenge", label: "Challenge", blurb: "How hard the questions push. Measured from your recent accuracy." },
];

interface ModalProps {
  profile: LearnerProfile;
  onChange: (profile: LearnerProfile) => void;
  onClose: () => void;
}

/**
 * The profile, out in the open. The measured value is shown next to every
 * dial, and the learner's override always wins — the model serves the person.
 */
export const ProfileModal: React.FC<ModalProps> = ({ profile, onChange, onClose }) => {
  const levels = effectiveLevels(profile);
  const hasOverrides = Object.keys(profile.overrides).length > 0;

  function setLevel(key: keyof LearnerLevels, value: Level) {
    const overrides = { ...profile.overrides };
    if (profile.measured[key] === value) {
      delete overrides[key]; // agreeing with the measurement is not an override
    } else {
      overrides[key] = value;
    }
    onChange({ ...profile, overrides });
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D362E]/60 p-4 backdrop-blur-xs"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-serif text-xl font-bold">How you learn</h3>
            <p className="mt-0.5 text-xs text-[#7A837C]">
              Measured from your answers
              {profile.medianAnswerSeconds != null &&
                ` (~${profile.medianAnswerSeconds}s per question)`}
              . Override anything — your setting always wins.
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

        <div className="space-y-4">
          {DIMENSIONS.map((dim) => (
            <div key={dim.key}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs font-bold">{dim.label}</span>
                <span className="text-[10px] text-[#7A837C]">
                  measured: {profile.measured[dim.key]}
                  {profile.overrides[dim.key] && " · overridden"}
                </span>
              </div>
              <p className="mb-1.5 text-[11px] text-[#7A837C]">{dim.blurb}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    onClick={() => setLevel(dim.key, lv)}
                    className={`rounded-xl border py-2 text-xs font-bold capitalize transition-all ${
                      levels[dim.key] === lv
                        ? "border-[#5E7161] bg-[#5E7161] text-white"
                        : "border-[#E5E2D9] bg-[#FDFCF8] text-[#7A837C] hover:border-[#8BA88E]"
                    }`}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {hasOverrides && (
          <button
            onClick={() => onChange({ ...profile, overrides: {} })}
            className="mt-4 text-[11px] font-bold text-[#5E7161] underline underline-offset-2"
          >
            Clear my overrides — let the measurements decide
          </button>
        )}
      </motion.div>
    </div>
  );
};
