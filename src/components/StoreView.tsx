import React, { useState } from "react";
import { motion } from "motion/react";
import { AnimalSprite, ItemSprite } from "./PixelSprite";
import { EGG_FOR_SPECIES, FOODS, ITEM, SPECIES_LIST, type PetSpecies } from "../lib/sprites";
import type { Inventory, PetState } from "../types";

/**
 * The reward sink. Gems earned by studying buy food, and food is what keeps
 * the pet's energy up — so the loop closes: study, earn, care for the pet.
 */
export const StoreView: React.FC<{
  gems: number;
  pet: PetState;
  bench: PetState[];
  inventory: Inventory;
  adoptionCost: number;
  onBuy: (foodId: string) => void;
  onFeed: (foodId: string) => void;
  onAdopt: (species: PetSpecies, name: string) => void;
}> = ({ gems, pet, bench, inventory, adoptionCost, onBuy, onFeed, onAdopt }) => (
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

    <Adoption gems={gems} cost={adoptionCost} bench={bench} onAdopt={onAdopt} />
  </div>
);

/**
 * The adoption corner: more animals for the farm-to-be. New arrivals start as
 * eggs on the bench; the active companion stays whoever the learner chose,
 * because that bond — not a roster — is what the whole loop hangs on.
 */
const Adoption: React.FC<{
  gems: number;
  cost: number;
  bench: PetState[];
  onAdopt: (species: PetSpecies, name: string) => void;
}> = ({ gems, cost, bench, onAdopt }) => {
  const [species, setSpecies] = useState<PetSpecies>("chicken");
  const [name, setName] = useState("");
  const affordable = gems >= cost;

  return (
    <div className="mt-8 rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-sm">
      <h3 className="font-serif text-xl font-bold">Adoption corner</h3>
      <p className="mt-1 text-sm text-[#7A837C]">
        Another egg for your farm. New arrivals wait on the bench until you make them your
        companion — from the switcher on the Today page.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {SPECIES_LIST.map((s) => (
          <button
            key={s.id}
            onClick={() => setSpecies(s.id)}
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-2.5 transition-all ${
              species === s.id
                ? "border-[#5E7161] bg-[#F0F4F0]"
                : "border-[#E5E2D9] bg-white hover:border-[#8BA88E]"
            }`}
          >
            <ItemSprite item={EGG_FOR_SPECIES[s.id]} size={30} />
            <span className="text-[9px] font-bold uppercase tracking-wide text-[#7A837C]">
              {s.label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name the new arrival"
          maxLength={20}
          className="flex-1 rounded-2xl border border-[#E5E2D9] bg-[#FDFCF8] px-4 py-2.5 text-sm outline-none focus:border-[#5E7161]"
        />
        <button
          onClick={() => {
            onAdopt(species, name);
            setName("");
          }}
          disabled={!affordable || name.trim().length === 0}
          title={!affordable ? `You need ${cost - gems} more gems` : undefined}
          className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-[#5E7161] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#4E5F51] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ItemSprite item={ITEM.emerald} size={12} /> {cost} · Adopt
        </button>
      </div>

      {bench.length > 0 && (
        <div className="mt-4 border-t border-[#E5E2D9] pt-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#7A837C]">
            On the bench
          </div>
          <div className="flex flex-wrap gap-3">
            {bench.map((b) => (
              <div key={b.id} className="flex items-center gap-2 rounded-2xl border border-[#E5E2D9] bg-[#FDFCF8] px-3 py-2">
                {b.stage === "egg" ? (
                  <ItemSprite item={EGG_FOR_SPECIES[b.species]} size={22} />
                ) : (
                  <AnimalSprite species={b.species} stage={b.stage === "adult" ? "adult" : "baby"} size={26} animate={false} />
                )}
                <span className="text-xs font-bold">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
