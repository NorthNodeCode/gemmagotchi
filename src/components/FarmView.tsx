import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CloudRain, Droplets, Plus, Sun } from "lucide-react";
import { AnimalSprite, ItemSprite, PixelSprite } from "./PixelSprite";
import { CROPS, CROP_COLS, CROP_ROWS, CROP_SHEET, ITEM, cropById } from "../lib/sprites";
import { moodFor, type PetState } from "../lib/petState";
import type { FarmPlot } from "../types";

/**
 * The spirit farm: where focus minutes become something you can look at.
 *
 * Every minute of real study earns a minute of dew; dew waters crops; crops
 * become gems and pet growth. The loop is deliberately one-way — you cannot
 * buy dew — so a flourishing farm is a picture of time actually spent, the
 * way a garden is.
 *
 * Watering is once per plot per day. Growth here is study-driven, never
 * timer-driven: a farm that grows while you sleep is a farm that does not
 * need you.
 */

export const WATER_COST = 5;

interface Props {
  plots: FarmPlot[];
  dew: number;
  gems: number;
  pet: PetState;
  bench: PetState[];
  /** Today, in virtual days — watering allowance resets when it changes. */
  today: number;
  onPlant: (plotId: number, cropId: string) => void;
  onWater: (plotId: number) => void;
  onHarvest: (plotId: number) => void;
}

export const FarmView: React.FC<Props> = ({
  plots,
  dew,
  gems,
  pet,
  bench,
  today,
  onPlant,
  onWater,
  onHarvest,
}) => {
  const [picking, setPicking] = useState<number | null>(null);
  const wilting = moodFor(pet.health) === "sleepy";

  function clickPlot(plot: FarmPlot) {
    if (plot.stage === 0) {
      setPicking(picking === plot.id ? null : plot.id);
    } else if (plot.stage === 3) {
      onHarvest(plot.id);
    } else if (plot.lastWateredDay !== today && dew >= WATER_COST) {
      onWater(plot.id);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div
        className={`mb-5 flex items-center justify-between rounded-3xl border p-6 shadow-sm ${
          wilting ? "border-[#E8C5B0] bg-[#FFFBF5]" : "border-[#E5E2D9] bg-white"
        }`}
      >
        <div>
          <h2 className="flex items-center gap-2 font-serif text-2xl font-bold">
            {wilting ? (
              <CloudRain className="h-5 w-5 text-[#B4703F]" />
            ) : (
              <Sun className="h-5 w-5 text-[#D97706]" />
            )}
            Spirit farm
          </h2>
          <p className="mt-1 text-sm text-[#7A837C]">
            {wilting
              ? `The soil misses you — so does ${pet.name}. One small session brings the colour back.`
              : "Every study minute earns a minute of dew. Dew grows crops; crops become gems."}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="flex items-center gap-1.5 rounded-2xl border border-[#E5E2D9] bg-[#F0F4F0] px-3.5 py-2 text-sm font-bold text-[#5E7161]">
            <Droplets className="h-4 w-4" /> {dew}m dew
          </span>
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#7A837C]">
            <ItemSprite item={ITEM.emerald} size={13} /> {gems}
          </span>
        </div>
      </div>

      <div
        className={`grid grid-cols-3 gap-3 rounded-3xl border p-5 ${
          wilting ? "border-[#E8C5B0] bg-[#F8F1E7]" : "border-[#E5E2D9] bg-[#F2EFE5]"
        }`}
      >
        {plots.map((plot) => {
          const crop = cropById(plot.crop);
          const wateredToday = plot.lastWateredDay === today;
          return (
            <button
              key={plot.id}
              onClick={() => clickPlot(plot)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl border-2 transition-all ${
                plot.stage === 3
                  ? "border-[#D97706] bg-[#FFF8F0] hover:bg-[#FDF0DC]"
                  : plot.stage === 0
                  ? "border-dashed border-[#C9CCC7] bg-white/60 hover:border-[#8BA88E]"
                  : "border-[#E5E2D9] bg-white/80 hover:border-[#8BA88E]"
              } ${wilting ? "saturate-[0.6]" : ""}`}
            >
              {plot.stage === 0 ? (
                <>
                  <Plus className="h-5 w-5 text-[#C9CCC7]" />
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#7A837C]">
                    Sow
                  </span>
                </>
              ) : (
                crop && (
                  <>
                    <motion.div
                      animate={
                        plot.stage === 3 ? { scale: [1, 1.08, 1], y: [0, -2, 0] } : undefined
                      }
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <PixelSprite
                        src={CROP_SHEET}
                        cols={CROP_COLS}
                        rows={CROP_ROWS}
                        col={crop.cells[plot.stage - 1]}
                        row={crop.row}
                        size={64}
                      />
                    </motion.div>
                    <span className="mt-1 max-w-[90%] truncate text-[10px] font-bold text-[#5E7161]">
                      {crop.label}
                    </span>
                    {plot.stage === 3 ? (
                      <span className="absolute right-2 top-2 animate-pulse rounded-full bg-[#D97706] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                        Harvest · +{crop.gemYield}💎
                      </span>
                    ) : wateredToday ? (
                      <span className="absolute right-2 top-2 rounded-full bg-[#F0F4F0] px-2 py-0.5 text-[9px] font-bold text-[#5E7161]">
                        ✓ watered
                      </span>
                    ) : (
                      <span
                        className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          dew >= WATER_COST
                            ? "bg-[#E7F0F6] text-[#4A7B9D]"
                            : "bg-[#F5F2EA] text-[#7A837C]"
                        }`}
                      >
                        💧 {WATER_COST}m
                      </span>
                    )}
                  </>
                )
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {picking !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-3xl border border-[#E5E2D9] bg-white p-5">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#7A837C]">
                Sow plot {picking + 1} — planting is free, growing takes study
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {CROPS.filter((c) => !c.premium).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onPlant(picking, c.id);
                      setPicking(null);
                    }}
                    className="flex flex-col items-center gap-1 rounded-2xl border border-[#E5E2D9] bg-[#FDFCF8] p-3 transition-all hover:border-[#8BA88E] hover:bg-[#F0F4F0]"
                  >
                    <PixelSprite
                      src={CROP_SHEET}
                      cols={CROP_COLS}
                      rows={CROP_ROWS}
                      col={c.cells[2]}
                      row={c.row}
                      size={40}
                    />
                    <span className="text-[10px] font-bold leading-tight">{c.label}</span>
                    <span className="text-[9px] text-[#D97706]">+{c.gemYield}💎</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The family, out on the land. The companion works; the bench rests. */}
      <div className="mt-4 flex items-end justify-center gap-8 rounded-3xl border border-[#E5E2D9] bg-white p-5">
        <div className="flex flex-col items-center">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          >
            {pet.stage === "egg" ? (
              <ItemSprite item={ITEM.whiteEgg} size={40} />
            ) : (
              <AnimalSprite
                species={pet.species}
                stage={pet.stage === "adult" ? "adult" : "baby"}
                size={56}
              />
            )}
          </motion.div>
          <span className="mt-1 text-[10px] font-bold text-[#5E7161]">{pet.name}</span>
        </div>
        {bench.map((b, i) => (
          <div key={b.id} className="flex flex-col items-center opacity-80">
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 2.8 + i * 0.4, ease: "easeInOut" }}
            >
              {b.stage === "egg" ? (
                <ItemSprite item={ITEM.brownEgg} size={32} />
              ) : (
                <AnimalSprite
                  species={b.species}
                  stage={b.stage === "adult" ? "adult" : "baby"}
                  size={44}
                  fps={2}
                />
              )}
            </motion.div>
            <span className="mt-1 text-[10px] text-[#7A837C]">{b.name}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-[11px] text-[#7A837C]">
        One watering per plot per day · harvesting also grows {pet.name} a little.
      </p>
    </div>
  );
};
