import React from "react";
import { AvatarSprite, ItemSprite } from "./PixelSprite";
import { ITEM } from "../lib/sprites";
import { Flame, FastForward, RotateCcw, Cpu, Cloud, Bot, Trophy } from "lucide-react";
import type { Learner, PetState, ProviderInfo } from "../types";

export type Tab = "today" | "courses" | "plan" | "store" | "trajectory";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "today", label: "Today" },
  { id: "courses", label: "Courses" },
  { id: "plan", label: "Study plan" },
  { id: "store", label: "Store" },
  { id: "trajectory", label: "Trajectory" },
];

interface Props {
  learner: Learner;
  pet: PetState;
  gems: number;
  tab: Tab;
  provider: ProviderInfo | null;
  clockDays: number;
  onTab: (t: Tab) => void;
  onAdvanceDay: () => void;
  onResetClock: () => void;
  onOpenSocratic: () => void;
  onOpenGems: () => void;
  onOpenPitch: () => void;
}

export const Header: React.FC<Props> = ({
  learner,
  pet,
  gems,
  tab,
  provider,
  clockDays,
  onTab,
  onAdvanceDay,
  onResetClock,
  onOpenSocratic,
  onOpenGems,
  onOpenPitch,
}) => (
  <header className="sticky top-0 z-40 border-b border-[#E5E2D9] bg-[#FDFCF8]/95 backdrop-blur">
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AvatarSprite character={learner.character} size={36} />
          <div>
            <div className="font-serif text-lg font-bold leading-none text-[#2D362E]">
              Gemmagotchi
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#7A837C]">
              {provider?.provider === "local" ? (
                <>
                  <Cpu className="h-3 w-3" /> {provider.model} · on-device
                </>
              ) : provider?.provider === "hosted" ? (
                <>
                  <Cloud className="h-3 w-3" /> {provider.model}
                </>
              ) : (
                "Gemma 4"
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenSocratic}
            className="flex items-center gap-1.5 rounded-full border border-[#E5E2D9] bg-white px-3 py-1.5 text-xs font-bold text-[#5E7161] transition-colors hover:bg-[#F0F4F0]"
          >
            <Bot className="h-3.5 w-3.5" /> Ask Gemma
          </button>
          <button
            onClick={onOpenPitch}
            title="Kaggle competition pitch"
            className="flex items-center gap-1.5 rounded-full border border-[#F0D194] bg-[#FFF8F0] px-3 py-1.5 text-xs font-bold text-[#D97706] transition-colors hover:bg-[#FDF0DC]"
          >
            <Trophy className="h-3.5 w-3.5" /> Kaggle pitch
          </button>

          <div className="flex items-center gap-1.5 rounded-full border border-[#E5E2D9] bg-white px-3 py-1.5">
            <Flame className={`h-3.5 w-3.5 ${pet.streak > 0 ? "text-[#D97706]" : "text-[#C9CCC7]"}`} />
            <span className="text-xs font-bold">{pet.streak}</span>
          </div>
          <button
            onClick={onOpenGems}
            title="Open the gem sanctuary"
            className="flex items-center gap-1.5 rounded-full border border-[#E5E2D9] bg-white px-3 py-1.5 transition-colors hover:bg-[#F0F4F0]"
          >
            <ItemSprite item={ITEM.emerald} size={14} />
            <span className="text-xs font-bold">{gems}</span>
          </button>

          {/* Demo control: the habit loop plays out over days, so the pitch
              needs a way to move through them without waiting. */}
          <div className="flex items-center overflow-hidden rounded-full border border-[#E5E2D9] bg-white">
            <button
              onClick={onAdvanceDay}
              title="Skip a day forward"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#5E7161] transition-colors hover:bg-[#F0F4F0]"
            >
              <FastForward className="h-3.5 w-3.5" /> +1 day
            </button>
            {clockDays !== 0 && (
              <button
                onClick={onResetClock}
                title="Back to real time"
                className="border-l border-[#E5E2D9] px-2.5 py-1.5 text-[#7A837C] transition-colors hover:bg-[#F5F2EA]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <nav className="flex gap-1 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
              tab === t.id
                ? "bg-[#5E7161] text-white"
                : "text-[#7A837C] hover:bg-[#F0F4F0] hover:text-[#2D362E]"
            }`}
          >
            {t.label}
          </button>
        ))}
        {clockDays !== 0 && (
          <span className="ml-auto self-center rounded-full bg-[#FFF5F5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#B85B56]">
            demo clock +{clockDays}d
          </span>
        )}
      </nav>
    </div>
  </header>
);
