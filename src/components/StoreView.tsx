import React from "react";
import { motion } from "motion/react";
import { ItemSprite } from "./PixelSprite";
import { FOODS, ITEM } from "../lib/sprites";
import type { Inventory, PetState } from "../types";

/**
 * The reward sink. Gems earned by studying buy food, and food is what keeps
 * the pet's energy up — so the loop closes: study, earn, care for the pet.
 */
export const StoreView: React.FC<{
  gems: number;
  pet: PetState;
  inventory: Inventory;
  onBuy: (foodId: string) => void;
  onFeed: (foodId: string) => void;
}> = ({ gems, pet, inventory, onBuy, onFeed }) => (
  <div className="mx-auto max-w-3xl">
    <div className="mb-5 flex items-center justify-between rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
      <div>
        <h2 className="font-serif text-2xl font-bold">Feed store</h2>
        <p className="mt-1 text-sm text-[#7A837C]">
          Gems come from studying. Food restores {pet.name}'s energy.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-[#E5E2D9] bg-[#F5F2EA] px-4 py-2.5">
        <ItemSprite item={ITEM.emerald} size={20} />
        <span className="text-lg font-bold">{gems}</span>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      {FOODS.map((food) => {
        const held = inventory.food[food.id] ?? 0;
        const affordable = gems >= food.cost;
        return (
          <motion.div
            key={food.id}
            layout
            className="flex items-center gap-4 rounded-2xl border border-[#E5E2D9] bg-white p-4"
          >
            <div className="rounded-2xl border border-[#E5E2D9] bg-[#F5F2EA] p-2.5">
              <ItemSprite item={food.item} size={36} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-serif text-base font-bold text-[#2D362E]">{food.label}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#7A837C]">
                <ItemSprite item={ITEM.emerald} size={12} />
                {food.cost} · +{food.health} energy
              </div>
              {held > 0 && (
                <div className="mt-1 text-[11px] font-bold text-[#5E7161]">
                  {held} in your bag
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <button
                onClick={() => onBuy(food.id)}
                disabled={!affordable}
                className="rounded-xl bg-[#5E7161] px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-[#4E5F51] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Buy
              </button>
              <button
                onClick={() => onFeed(food.id)}
                disabled={held === 0 || pet.health >= 100}
                className="rounded-xl border border-[#E5E2D9] bg-white px-3.5 py-2 text-xs font-bold text-[#5E7161] transition-all hover:bg-[#F0F4F0] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Feed
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>

    <p className="mt-5 text-center text-xs text-[#7A837C]">
      Food tops {pet.name} up, but only studying makes them grow.
    </p>
  </div>
);
