import React from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { Award, BookOpen, Check, Heart, Sparkles, X } from "lucide-react";
import { ItemSprite } from "./PixelSprite";
import { ITEM } from "../lib/sprites";
import { GROWTH_TO_ADULT, GROWTH_TO_HATCH, type PetState } from "../lib/petState";
import type { Inventory } from "../types";

/**
 * What gems are for.
 *
 * Every reward here is a way to help the pet, never a way to skip studying —
 * the currency has to stay downstream of the work or the loop is hollow. The
 * earning table is shown alongside the catalogue on purpose: knowing exactly
 * what an action pays is what makes the next action feel worth starting.
 */

export type RewardId = "elixir" | "surge" | "masterclass";

export interface Reward {
  id: RewardId;
  label: string;
  detail: string;
  cost: number;
  icon: React.ElementType;
  tint: string;
}

export const REWARDS: Reward[] = [
  {
    id: "elixir",
    label: "Spirit elixir",
    detail: "Restores 50 energy right away. Wakes a sleeping companion.",
    cost: 15,
    icon: Heart,
    tint: "bg-[#FFF5F5] border-[#E8C5B0] text-[#B85B56]",
  },
  {
    id: "surge",
    label: "Growth surge",
    detail: `Adds 3 growth — a quarter of the way from hatching to fully grown.`,
    cost: 25,
    icon: Award,
    tint: "bg-[#FFF8F0] border-[#F0D194] text-[#D97706]",
  },
  {
    id: "masterclass",
    label: "Socratic masterclass",
    detail: "Unlocks 'Go deeper' on every check question, for good.",
    cost: 10,
    icon: BookOpen,
    tint: "bg-[#F5F2EA] border-[#E5E2D9] text-[#8C593B]",
  },
];

/** How gems are actually earned. These match the numbers in App/petState. */
const EARNINGS: Array<{ label: string; amount: string }> = [
  { label: "Correct check answer", amount: "+5" },
  { label: "Finish a sub-lesson", amount: "+15–21" },
  { label: "Complete a 2-minute rescue", amount: "+5" },
  { label: "Come back after time away", amount: "up to +50" },
];

interface Props {
  gems: number;
  pet: PetState;
  inventory: Inventory;
  onRedeem: (reward: Reward) => void;
  onClose: () => void;
}

export const GemSanctuary: React.FC<Props> = ({ gems, pet, inventory, onRedeem, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#2D362E]/60 p-4 backdrop-blur-xs">
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-8 max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-2xl"
    >
      <div className="mb-5 flex items-start justify-between border-b border-[#E5E2D9] pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-[#F0D194] bg-[#FFF8F0] p-3">
            <ItemSprite item={ITEM.emerald} size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-xl font-bold">Gem sanctuary</h3>
              <span className="rounded-full border border-[#D97706]/30 bg-[#D97706]/10 px-2.5 py-0.5 text-xs font-bold text-[#D97706]">
                {gems} in hand
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[#7A837C]">
              Everything here helps {pet.name}. Nothing here skips the studying.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-2 text-[#7A837C] transition-colors hover:bg-[#F5F2EA] hover:text-[#2D362E]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-6 rounded-2xl border border-[#E5E2D9] bg-[#F5F2EA] p-4">
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5E7161]">
          <Sparkles className="h-4 w-4 text-[#D97706]" /> How you earn them
        </h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {EARNINGS.map((e) => (
            <div
              key={e.label}
              className="flex items-center justify-between rounded-xl border border-[#E5E2D9] bg-white px-2.5 py-2 text-xs"
            >
              <span>{e.label}</span>
              <span className="font-bold text-[#D97706]">{e.amount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {REWARDS.map((reward) => {
          const owned = reward.id === "masterclass" && inventory.owned.includes("masterclass");
          const maxed = reward.id === "elixir" && pet.health >= 100;
          const grown = reward.id === "surge" && pet.stage === "adult";
          const blocked = owned || maxed || grown;
          const affordable = gems >= reward.cost;

          return (
            <div
              key={reward.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#E5E2D9] bg-[#FDFCF8] p-4 transition-colors hover:border-[#8BA88E]"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-xl border p-2.5 ${reward.tint}`}>
                  <reward.icon className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold">{reward.label}</h5>
                  <p className="text-[11px] text-[#7A837C]">
                    {blocked ? blockedReason(reward.id, pet) : reward.detail}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  onRedeem(reward);
                  confetti({ particleCount: 45, spread: 65, origin: { y: 0.6 } });
                }}
                disabled={blocked || !affordable}
                title={!affordable ? `You need ${reward.cost - gems} more` : undefined}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#5E7161] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#4E5F51] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {owned ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Owned
                  </>
                ) : (
                  <>
                    <ItemSprite item={ITEM.emerald} size={12} /> {reward.cost}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[11px] text-[#7A837C]">
        {pet.stage === "egg"
          ? `${GROWTH_TO_HATCH} growth hatches the egg.`
          : pet.stage === "baby"
          ? `${Math.max(0, GROWTH_TO_ADULT - pet.growth)} more growth until ${pet.name} is fully grown.`
          : `${pet.name} is fully grown.`}
      </p>
    </motion.div>
  </div>
);

function blockedReason(id: RewardId, pet: PetState): string {
  if (id === "masterclass") return "Already unlocked — look for 'Go deeper' after a check question.";
  if (id === "elixir") return `${pet.name} is already at full energy.`;
  return `${pet.name} is already fully grown.`;
}
