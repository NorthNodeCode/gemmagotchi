import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AnimalSprite, ItemSprite, PixelSprite } from "./PixelSprite";
import { EGG_FOR_SPECIES, SPECIES } from "../lib/sprites";
import { growthProgress, moodFor, type PetState } from "../lib/petState";

const MOOD_COPY: Record<string, string> = {
  thriving: "Thriving",
  content: "Content",
  hungry: "Peckish",
  sleepy: "Napping",
};

/**
 * Which row of the animal sheet to draw. Row 4 is the head-down grazing pose,
 * which reads as dozing when the pet has been left alone for a while.
 */
function rowForMood(mood: string): number {
  return mood === "sleepy" ? 4 : 0;
}

interface Props {
  pet: PetState;
  size?: number;
  /** Bumps whenever the learner gets something right, to play the grow pop. */
  celebrateKey?: number;
  showBars?: boolean;
  speech?: string | null;
  onClick?: () => void;
}

export const PetCompanion: React.FC<Props> = ({
  pet,
  size = 160,
  celebrateKey = 0,
  showBars = true,
  speech,
  onClick,
}) => {
  const mood = moodFor(pet.health);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (celebrateKey === 0) return;
    setPop(true);
    const t = setTimeout(() => setPop(false), 700);
    return () => clearTimeout(t);
  }, [celebrateKey]);

  const progress = growthProgress(pet);

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center" style={{ minHeight: size + 24 }}>
        {/* Soft ground shadow so the sprite doesn't float in space. */}
        <div
          className="absolute rounded-[50%] bg-[#2D362E]/10 blur-[2px]"
          style={{ width: size * 0.55, height: size * 0.12, bottom: 6 }}
        />

        <AnimatePresence>
          {speech && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.94 }}
              animate={{ opacity: 1, y: -8, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.9 }}
              className="absolute -top-2 z-20 max-w-xs rounded-2xl border border-[#E5E2D9] bg-white px-3.5 py-2 text-center text-xs font-medium text-[#2D362E] shadow-lg"
            >
              {speech}
              <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-[#E5E2D9] bg-white" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={onClick}
          animate={
            pop
              ? { scale: [1, 1.25, 1], y: [0, -14, 0] }
              : mood === "sleepy"
              ? { y: [0, 1.5, 0] }
              : { y: [0, -5, 0] }
          }
          transition={
            pop
              ? { duration: 0.7, ease: "easeOut" }
              : { repeat: Infinity, duration: mood === "sleepy" ? 4 : 2.4, ease: "easeInOut" }
          }
          className="relative cursor-pointer bg-transparent"
          aria-label={`${pet.name} the ${pet.species}`}
        >
          {pet.stage === "egg" ? (
            <EggSprite species={pet.species} size={size} />
          ) : (
            <AnimalSprite
              species={pet.species}
              stage={pet.stage === "adult" ? "adult" : "baby"}
              row={rowForMood(mood)}
              size={size}
              fps={mood === "sleepy" ? 2 : 4}
            />
          )}
        </motion.button>

        {/* Hearts burst out of the pet when it grows. */}
        <AnimatePresence>
          {pop &&
            [0, 1, 2].map((i) => (
              <motion.div
                key={`${celebrateKey}-${i}`}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 0], x: (i - 1) * 34, y: -60 - i * 8, scale: 1.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, delay: i * 0.08 }}
                className="pointer-events-none absolute"
              >
                <PixelSprite
                  src="/pixelart/animals/heart.png"
                  cols={1}
                  rows={1}
                  col={0}
                  row={0}
                  size={20}
                />
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      <div className="mt-1 text-center">
        <div className="font-serif text-lg font-bold text-[#2D362E]">{pet.name}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7A837C]">
          {pet.stage === "egg" ? "Egg" : pet.stage === "baby" ? "Young" : "Grown"}{" "}
          {SPECIES[pet.species]?.label ?? "friend"} · {MOOD_COPY[mood]}
        </div>
      </div>

      {showBars && (
        <div className="mt-3 w-full max-w-[220px] space-y-2">
          <Bar
            label="Energy"
            value={pet.health}
            colour={
              pet.health >= 55 ? "bg-[#5E7161]" : pet.health >= 30 ? "bg-[#D97706]" : "bg-[#B85B56]"
            }
          />
          <Bar
            label={pet.stage === "adult" ? "Fully grown" : "Growing"}
            value={progress * 100}
            colour="bg-[#8BA88E]"
          />
        </div>
      )}
    </div>
  );
};

const Bar: React.FC<{ label: string; value: number; colour: string }> = ({
  label,
  value,
  colour,
}) => (
  <div>
    <div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-wider text-[#7A837C]">
      <span>{label}</span>
      <span>{Math.round(value)}%</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-[#E5E2D9]">
      <motion.div
        className={`h-full rounded-full ${colour}`}
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  </div>
);

/** The egg wobbles gently — it is visibly about to become something. */
const EggSprite: React.FC<{ species: PetState["species"]; size: number }> = ({ species, size }) => (
  <motion.div
    animate={{ rotate: [0, -6, 0, 6, 0] }}
    transition={{
      repeat: Infinity,
      duration: 2.6,
      ease: "easeInOut",
      times: [0, 0.15, 0.3, 0.45, 1],
    }}
  >
    <ItemSprite item={EGG_FOR_SPECIES[species]} size={size * 0.72} />
  </motion.div>
);
