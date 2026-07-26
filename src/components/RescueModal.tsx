import React, { useState } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { Loader2, LifeBuoy, Check } from "lucide-react";
import type { PetState, RescuePayload } from "../types";

/**
 * The restart.
 *
 * This exists for the exact moment that sinks most study apps: the learner has
 * fallen behind, feels bad about it, and that feeling makes opening the app
 * worse than avoiding it. So the task here is trivially small on purpose, the
 * question is easy on purpose, and nothing in the copy references the gap.
 */
export const RescueModal: React.FC<{
  pet: PetState;
  data: RescuePayload | null;
  loading: boolean;
  onComplete: () => void;
  onClose: () => void;
}> = ({ pet, data, loading, onComplete, onClose }) => {
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D362E]/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl border border-[#E8C5B0] bg-[#FFFBF5] p-2.5 text-[#B4703F]">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[#2D362E]">
              {data?.rescueTitle || "A two-minute restart"}
            </h3>
            <p className="text-xs font-semibold text-[#B4703F]">
              Small enough that it barely counts. That's the point.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="mb-3 h-7 w-7 animate-spin text-[#5E7161]" />
            <p className="text-xs font-bold text-[#2D362E]">
              Gemma 4 is finding you the smallest possible first step…
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#E5E2D9] bg-[#F5F2EA] p-4">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#B4703F]">
                Just do this
              </div>
              <p className="text-sm font-semibold text-[#2D362E]">{data?.microChallenge}</p>
            </div>

            {data?.quickQuestion && (
              <div className="rounded-2xl border border-[#E5E2D9] bg-[#FDFCF8] p-4">
                <p className="mb-2.5 text-sm font-bold text-[#2D362E]">
                  {data.quickQuestion.question}
                </p>
                <div className="space-y-2">
                  {data.quickQuestion.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setPicked(i)}
                      className={`flex w-full items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition-all ${
                        picked === i
                          ? "border-[#5E7161] bg-[#F0F4F0] font-bold"
                          : "border-[#E5E2D9] bg-white hover:border-[#8BA88E]"
                      }`}
                    >
                      {picked === i && <Check className="h-3.5 w-3.5 text-[#5E7161]" />}
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {data?.encouragement && (
              <p className="text-center text-xs italic text-[#7A837C]">{data.encouragement}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-2xl border border-[#E5E2D9] px-4 py-3 text-xs font-bold text-[#7A837C] transition-all hover:bg-[#F5F2EA]"
              >
                Not now
              </button>
              <button
                onClick={() => {
                  confetti({ particleCount: 60, spread: 65, origin: { y: 0.6 } });
                  onComplete();
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#5E7161] py-3 text-sm font-bold text-white transition-all hover:bg-[#4E5F51]"
              >
                <Check className="h-4 w-4" /> Done — that was easy
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
